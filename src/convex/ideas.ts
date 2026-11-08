import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { allows, normaliseStage } from "./protocol";
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
  },
  handler: async (ctx, args) => {
    await loadRoom(ctx, args.roomId);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found.");

    if (!allows(normaliseStage(room.stage), "contribute")) {
      throw new Error(
        "The floor is closed. Nothing new goes down; score what is already there.",
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
    });

    return args.ideaId;
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

    // Detach any iterations so the record does not point at a deleted idea.
    const children = await ctx.db
      .query("ideas")
      .withIndex("by_room", (q) => q.eq("roomId", idea.roomId))
      .collect();
    for (const child of children) {
      if (child.parentId === ideaId) {
        await ctx.db.patch(child._id, { parentId: undefined });
      }
    }

    await ctx.db.delete(ideaId);
  },
});
