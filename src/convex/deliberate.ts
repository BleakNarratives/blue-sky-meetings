import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { MIGHT_STANCES, OUGHT_STANCES, isRevealed } from "./protocol";

const kindValidator = v.union(v.literal("human"), v.literal("agent"));
const mightValidator = v.union(
  v.literal("unlikely"),
  v.literal("even"),
  v.literal("likely"),
);
const oughtValidator = v.union(
  v.literal("should"),
  v.literal("shouldnt"),
  v.literal("undecided"),
);
const reviewValidator = v.union(v.literal(0), v.literal(90), v.literal(365));

async function loadRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to take a position.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  if (!isRevealed(room)) {
    throw new Error("The pool is sealed. Positions open after the reveal.");
  }
  const user = await ctx.db.get(userId);
  const seat = (user?.name ?? user?.email ?? "A seat").trim().slice(0, 60);
  return { room, userId, seat };
}

/**
 * One seat's pair: Might and Ought. They are deliberately not one number.
 * A thing can be workable, unlikely, and wrong at the same time.
 */
export const setPosition = mutation({
  args: {
    ideaId: v.id("ideas"),
    might: mightValidator,
    ought: oughtValidator,
    note: v.optional(v.string()),
    contributor: v.string(),
    kind: kindValidator,
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found.");
    await loadRoom(ctx, idea.roomId);

    if (!MIGHT_STANCES.some((entry) => entry.key === args.might)) {
      throw new Error("That isn't a likelihood this room records.");
    }
    if (!OUGHT_STANCES.some((entry) => entry.key === args.ought)) {
      throw new Error("That isn't a position this room records.");
    }

    const contributor = args.contributor.trim().slice(0, 60) || "Unattributed";
    const patch = {
      might: args.might,
      ought: args.ought,
      note: args.note?.trim().slice(0, 400) || undefined,
      kind: args.kind,
    };

    const existing = await ctx.db
      .query("positions")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .collect();
    const mine = existing.find(
      (row) => row.contributor.trim().toLowerCase() === contributor.toLowerCase(),
    );

    if (mine) {
      await ctx.db.patch(mine._id, patch);
      return mine._id;
    }

    return await ctx.db.insert("positions", {
      ...patch,
      roomId: idea.roomId,
      ideaId: args.ideaId,
      contributor,
    });
  },
});

/**
 * Send an idea to the Bestiary: off the table, still in the record, with a
 * reason, a keeper, and a date to look again. Nothing is deleted.
 */
export const keep = mutation({
  args: {
    ideaId: v.id("ideas"),
    note: v.string(),
    reviewDays: reviewValidator,
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found.");
    const { seat } = await loadRoom(ctx, idea.roomId);

    const note = args.note.trim().slice(0, 400);
    if (note.length < 6) {
      throw new Error("Name why it is being kept, not just that it is.");
    }

    await ctx.db.patch(args.ideaId, {
      disposition: "bestiary",
      dispositionNote: note,
      dispositionBy: seat,
      dispositionAt: Date.now(),
      reviewAt:
        args.reviewDays > 0 ? Date.now() + args.reviewDays * 86400000 : undefined,
    });

    return args.ideaId;
  },
});

/** Put it back on the table. The shelf is not a verdict. */
export const restore = mutation({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found.");
    await loadRoom(ctx, idea.roomId);

    await ctx.db.patch(ideaId, {
      disposition: "live",
      dispositionNote: undefined,
      dispositionBy: undefined,
      dispositionAt: undefined,
      reviewAt: undefined,
    });

    return ideaId;
  },
});
