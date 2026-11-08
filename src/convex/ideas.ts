import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { clampScore } from "./runscore";

const kindValidator = v.union(v.literal("human"), v.literal("agent"));

async function assertRoomOwner(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to enter a room.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  return userId;
}

/** Put an unannounced idea on the table. */
export const add = mutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
    thesis: v.string(),
    contributor: v.string(),
    kind: kindValidator,
  },
  handler: async (ctx, args) => {
    await assertRoomOwner(ctx, args.roomId);

    const title = args.title.trim().slice(0, 120);
    if (title.length < 3) throw new Error("The idea needs a name.");
    const contributor = args.contributor.trim().slice(0, 60) || "Unattributed";

    return await ctx.db.insert("ideas", {
      roomId: args.roomId,
      title,
      thesis: args.thesis.trim().slice(0, 600),
      contributor,
      kind: args.kind,
    });
  },
});

/**
 * Score one idea. One seat per voice: scoring again as the same contributor
 * replaces that assessment instead of stacking, so a single participant
 * cannot move a runscore by repeating themselves.
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

    await assertRoomOwner(ctx, idea.roomId);
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

/** Remove an idea and everything scored against it. */
export const remove = mutation({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found.");
    await assertRoomOwner(ctx, idea.roomId);

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_idea", (q) => q.eq("ideaId", ideaId))
      .collect();
    for (const assessment of assessments) await ctx.db.delete(assessment._id);
    await ctx.db.delete(ideaId);
  },
});
