import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { CHAIRS, isRevealed } from "./protocol";

const kindValidator = v.union(v.literal("human"), v.literal("agent"));

async function loadRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to convene the board.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  if (!isRevealed(room)) {
    throw new Error("The pool is sealed. The board meets after the reveal.");
  }
  return room;
}

/**
 * One reading from one chair. A seat can revise its own reading — the board
 * keeps one position per seat per chair, so repetition cannot amplify a case.
 */
export const speak = mutation({
  args: {
    ideaId: v.id("ideas"),
    chair: v.string(),
    body: v.string(),
    contributor: v.string(),
    kind: kindValidator,
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found.");
    await loadRoom(ctx, idea.roomId);

    const chair = CHAIRS.find((entry) => entry.key === args.chair);
    if (!chair) throw new Error("That chair isn't at this table.");

    const contributor = args.contributor.trim().slice(0, 60) || "Unattributed";
    const body = args.body.trim().slice(0, 600);
    if (body.length < 3) throw new Error("Say enough to be answered.");

    const existing = await ctx.db
      .query("readings")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .collect();

    const mine = existing.find(
      (row) =>
        row.chair === chair.key &&
        row.contributor.trim().toLowerCase() === contributor.toLowerCase(),
    );

    if (mine) {
      await ctx.db.patch(mine._id, { body, kind: args.kind });
      return mine._id;
    }

    return await ctx.db.insert("readings", {
      roomId: idea.roomId,
      ideaId: args.ideaId,
      chair: chair.key,
      body,
      contributor,
      kind: args.kind,
    });
  },
});

/** Withdraw a reading. The record is allowed to get quieter. */
export const retract = mutation({
  args: { readingId: v.id("readings") },
  handler: async (ctx, { readingId }) => {
    const reading = await ctx.db.get(readingId);
    if (!reading) throw new Error("Reading not found.");
    await loadRoom(ctx, reading.roomId);
    await ctx.db.delete(readingId);
  },
});
