import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { allows, isRevealed, normaliseStage } from "./protocol";
import { clampScore } from "./runscore";

const kindValidator = v.union(v.literal("human"), v.literal("agent"));
const trackValidator = v.union(
  v.literal("concept"),
  v.literal("brand"),
  v.literal("market"),
  v.literal("wild"),
);

async function loadRoom(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to enter a room.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  return userId;
}

/** Put something on the table. Only while the floor is open. */
export const add = mutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
    thesis: v.string(),
    contributor: v.string(),
    kind: kindValidator,
    track: v.optional(trackValidator),
    parentId: v.optional(v.id("ideas")),
    bootstrap: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await loadRoom(ctx, args.roomId);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found.");

    const stage = normaliseStage(room.stage);
    const isBuildOn = Boolean(args.parentId);

    if (stage === "open") {
      if (isBuildOn) {
        throw new Error(
          "The pool is sealed. You can build on an idea once it has been revealed.",
        );
      }
    } else if (stage === "assessment" && isBuildOn) {
      // Build-ons are the only additions allowed after the reveal.
    } else if (stage === "authorized") {
      throw new Error(
        "The room is authorized. It is closed to new contributions and build-ons.",
      );
    } else {
      throw new Error(
        "New entries are closed. Build on something already on the table.",
      );
    }

    const title = args.title.trim().slice(0, 120);
    if (title.length < 3) throw new Error("Give it a few words at least.");
    const contributor = args.contributor.trim().slice(0, 60) || "Unattributed";

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.roomId !== args.roomId) {
        throw new Error("That idea isn't on this table.");
      }
    }

    return await ctx.db.insert("ideas", {
      roomId: args.roomId,
      title,
      thesis: args.thesis.trim().slice(0, 600),
      contributor,
      kind: args.kind,
      track: args.track ?? "concept",
      parentId: args.parentId,
      bootstrap: args.bootstrap?.trim().slice(0, 160) || undefined,
    });
  },
});

/**
 * Breed two ideas into a third. A hybrid carries both lineages and starts
 * unscored: the combination gets no inherited score, only an inherited
 * question. Allowed only while the room is still working things out.
 */
export const breed = mutation({
  args: {
    aId: v.id("ideas"),
    bId: v.id("ideas"),
    title: v.string(),
    thesis: v.string(),
    contributor: v.string(),
    kind: kindValidator,
    track: v.optional(trackValidator),
    bootstrap: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.aId === args.bId) {
      throw new Error("Breeding takes two different ideas.");
    }

    const a = await ctx.db.get(args.aId);
    if (!a) throw new Error("Idea not found.");
    const b = await ctx.db.get(args.bId);
    if (!b || b.roomId !== a.roomId) {
      throw new Error("Both ideas have to be on this table.");
    }

    await loadRoom(ctx, a.roomId);
    const room = await ctx.db.get(a.roomId);
    if (!room) throw new Error("Room not found.");

    if (normaliseStage(room.stage) !== "assessment") {
      throw new Error(
        "Breeding happens while the room is assessing. Once it is authorized, the work is chosen.",
      );
    }

    const title = args.title.trim().slice(0, 120);
    if (title.length < 3) throw new Error("Give the hybrid a name.");
    const thesis = args.thesis.trim().slice(0, 600);
    if (thesis.length < 12) {
      throw new Error("Name what only the combination can do.");
    }

    return await ctx.db.insert("ideas", {
      roomId: a.roomId,
      title,
      thesis,
      contributor: args.contributor.trim().slice(0, 60) || "Unattributed",
      kind: args.kind,
      track: args.track ?? a.track ?? "concept",
      bootstrap: args.bootstrap?.trim().slice(0, 160) || undefined,
      bredFrom: [args.aId, args.bId],
    });
  },
});

/**
 * Score one idea. Only after the floor has closed — the room does not grade
 * what it has not finished hearing. One seat per voice: scoring again as the
 * same contributor replaces that pass instead of stacking, so a single
 * participant cannot move a runscore by repeating themselves.
 */
export const assess = mutation({
  args: {
    ideaId: v.id("ideas"),
    novelty: v.number(),
    warrant: v.number(),
    reach: v.number(),
    drag: v.number(),
    note: v.optional(v.string()),
    contributor: v.string(),
    kind: kindValidator,
    asymmetric: v.boolean(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found.");

    await loadRoom(ctx, idea.roomId);
    const room = await ctx.db.get(idea.roomId);
    if (!room) throw new Error("Room not found.");

    if (!allows(normaliseStage(room.stage), "score")) {
      throw new Error(
        "The room is still listening. Scoring opens when the floor closes.",
      );
    }

    const contributor = args.contributor.trim().slice(0, 60) || "Unattributed";
    const patch = {
      novelty: clampScore(args.novelty),
      warrant: clampScore(args.warrant),
      reach: clampScore(args.reach),
      drag: clampScore(args.drag),
      note: args.note?.trim().slice(0, 400) || undefined,
      contributor,
      kind: args.kind,
      asymmetric: args.asymmetric,
    };

    const existing = await ctx.db
      .query("assessments")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .collect();

    const seat = existing.find(
      (row) => row.contributor.toLowerCase() === contributor.toLowerCase(),
    );

    if (seat) {
      await ctx.db.patch(seat._id, patch);
      return seat._id;
    }

    return await ctx.db.insert("assessments", {
      ...patch,
      roomId: idea.roomId,
      ideaId: args.ideaId,
    });
  },
});

/**
 * Name the person or agent who will carry an idea into work. Only after a
 * human has authorized the room. Authorship does not entitle anyone to the
 * assignment, and assignment does not transfer authorship.
 */
export const assign = mutation({
  args: {
    ideaId: v.id("ideas"),
    steward: v.string(),
    stewardKind: kindValidator,
    mode: v.union(v.literal("explore"), v.literal("deliver")),
    bar: v.union(
      v.literal("provisional"),
      v.literal("viable"),
      v.literal("runaway"),
    ),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found.");

    await loadRoom(ctx, idea.roomId);
    const room = await ctx.db.get(idea.roomId);
    if (!room) throw new Error("Room not found.");

    if (!allows(normaliseStage(room.stage), "assign")) {
      throw new Error(
        "Assignment needs authorization first. Humans authorize; the machine advises.",
      );
    }

    const steward = args.steward.trim().slice(0, 60);
    if (!steward) throw new Error("Name a steward.");

    await ctx.db.patch(args.ideaId, {
      steward,
      stewardKind: args.stewardKind,
      assignmentMode: args.mode,
      bar: args.bar,
    });

    return args.ideaId;
  },
});

/**
 * A nod or a pushback. Company, not consensus: one per seat per idea, freely
 * withdrawn, never counted in the runscore and never used to order the table.
 */
export const react = mutation({
  args: {
    ideaId: v.id("ideas"),
    stance: v.union(v.literal("nod"), v.literal("push")),
  },
  handler: async (ctx, { ideaId, stance }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found.");

    const userId = await loadRoom(ctx, idea.roomId);
    const room = await ctx.db.get(idea.roomId);
    if (!room) throw new Error("Room not found.");

    if (!isRevealed(room)) {
      throw new Error("The pool is sealed. There is nothing to nod at yet.");
    }

    const user = await ctx.db.get(userId);
    const contributor = (user?.name ?? user?.email ?? "A seat").trim();

    const existing = await ctx.db
      .query("nods")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    const mine = existing.find(
      (row) => row.contributor.trim().toLowerCase() === contributor.toLowerCase(),
    );

    if (mine && mine.stance === stance) {
      await ctx.db.delete(mine._id);
      return null;
    }

    if (mine) {
      await ctx.db.patch(mine._id, { stance });
      return stance;
    }

    await ctx.db.insert("nods", {
      roomId: idea.roomId,
      ideaId,
      contributor,
      kind: "human",
      stance,
    });

    return stance;
  },
});

/** Remove an idea and everything scored against it. */
export const remove = mutation({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found.");
    await loadRoom(ctx, idea.roomId);

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const assessment of assessments) await ctx.db.delete(assessment._id);

    const nods = await ctx.db
      .query("nods")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const nod of nods) await ctx.db.delete(nod._id);

    // Declared sources go with the idea, including any uploaded file.
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const source of sources) {
      if (source.storageId) await ctx.storage.delete(source.storageId);
      await ctx.db.delete(source._id);
    }

    const readings = await ctx.db
      .query("readings")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const reading of readings) await ctx.db.delete(reading._id);

    const positions = await ctx.db
      .query("positions")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const position of positions) await ctx.db.delete(position._id);

    // A bout cannot survive one of its sides. Clear its ballots too.
    const bouts = await ctx.db
      .query("bouts")
      .withIndex("by_room", (q) => q.eq("roomId", idea.roomId))
      .collect();
    for (const bout of bouts) {
      if (bout.aId !== ideaId && bout.bId !== ideaId) continue;
      const votes = await ctx.db
        .query("boutVotes")
        .withIndex("by_bout", (q) => q.eq("boutId", bout._id))
        .collect();
      for (const vote of votes) await ctx.db.delete(vote._id);
      await ctx.db.delete(bout._id);
    }

    // Detach any lineage so the record does not point at a deleted idea.
    const children = await ctx.db
      .query("ideas")
      .withIndex("by_room", (q) => q.eq("roomId", idea.roomId))
      .collect();
    for (const child of children) {
      const patch: { parentId?: undefined; bredFrom?: Id<"ideas">[] } = {};
      let changed = false;
      if (child.parentId === ideaId) {
        patch.parentId = undefined;
        changed = true;
      }
      if (child.bredFrom?.includes(ideaId)) {
        const remaining = child.bredFrom.filter((id) => id !== ideaId);
        patch.bredFrom = remaining.length > 0 ? remaining : undefined;
        changed = true;
      }
      if (!changed) continue;
      await ctx.db.patch(child._id, patch);
    }

    await ctx.db.delete(ideaId);
  },
});
