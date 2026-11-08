import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isRevealed } from "./protocol";

const kindValidator = v.union(v.literal("human"), v.literal("agent"));
const sideValidator = v.union(
  v.literal("a"),
  v.literal("b"),
  v.literal("draw"),
);

async function loadRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to open the arena.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  if (!isRevealed(room)) {
    throw new Error("The pool is sealed. Nothing can be compared yet.");
  }
  const user = await ctx.db.get(userId);
  const seat = (user?.name ?? user?.email ?? "A seat").trim().slice(0, 60);
  return { room, userId, seat };
}

/**
 * Put two ideas head to head. A bout is a comparison, not an election: the
 * room advises with ballots, and a human calls it. Nothing is deleted.
 */
export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    aId: v.id("ideas"),
    bId: v.id("ideas"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const { seat } = await loadRoom(ctx, args.roomId);

    if (args.aId === args.bId) {
      throw new Error("A bout needs two different ideas.");
    }

    const [a, b] = await Promise.all([
      ctx.db.get(args.aId),
      ctx.db.get(args.bId),
    ]);
    if (!a || a.roomId !== args.roomId || !b || b.roomId !== args.roomId) {
      throw new Error("Both ideas have to be on this table.");
    }

    const question = args.question.trim().slice(0, 140);
    if (question.length < 6) throw new Error("Ask a question worth answering.");

    return await ctx.db.insert("bouts", {
      roomId: args.roomId,
      aId: args.aId,
      bId: args.bId,
      question,
      status: "open",
      createdBy: seat,
    });
  },
});

/**
 * One ballot per seat. A ballot can change its mind; it cannot stack. The
 * optional cases are the point: a vote with no reason is only a temperature.
 */
export const vote = mutation({
  args: {
    boutId: v.id("bouts"),
    side: sideValidator,
    forCase: v.optional(v.string()),
    againstCase: v.optional(v.string()),
    kind: kindValidator,
  },
  handler: async (ctx, args) => {
    const bout = await ctx.db.get(args.boutId);
    if (!bout) throw new Error("Bout not found.");
    const { seat } = await loadRoom(ctx, bout.roomId);

    if (bout.status === "called") {
      throw new Error("This bout has been called. The dissent stays on record.");
    }

    const patch = {
      side: args.side,
      forCase: args.forCase?.trim().slice(0, 240) || undefined,
      againstCase: args.againstCase?.trim().slice(0, 240) || undefined,
      kind: args.kind,
    };

    const existing = await ctx.db
      .query("boutVotes")
      .withIndex("by_bout", (q) => q.eq("boutId", args.boutId))
      .collect();
    const mine = existing.find(
      (row) => row.contributor.trim().toLowerCase() === seat.toLowerCase(),
    );

    if (mine) {
      await ctx.db.patch(mine._id, patch);
      return mine._id;
    }

    return await ctx.db.insert("boutVotes", {
      ...patch,
      boutId: args.boutId,
      roomId: bout.roomId,
      contributor: seat,
    });
  },
});

/**
 * Call the bout. A human does this — the host never calls a winner. The tally
 * is shown next to the call so a room can see when the call dissents from it.
 */
export const call = mutation({
  args: {
    boutId: v.id("bouts"),
    winner: v.union(v.literal("a"), v.literal("b")),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const bout = await ctx.db.get(args.boutId);
    if (!bout) throw new Error("Bout not found.");
    const { seat } = await loadRoom(ctx, bout.roomId);

    if (bout.status === "called") throw new Error("This bout is already called.");

    const rationale = args.rationale.trim().slice(0, 400);
    if (rationale.length < 3) {
      throw new Error("Name what decided it, not just who won.");
    }

    await ctx.db.patch(args.boutId, {
      status: "called",
      winnerId: args.winner === "a" ? bout.aId : bout.bId,
      rationale,
      calledBy: seat,
    });

    return args.winner;
  },
});

/** Clear a bout and its ballots. The ideas themselves are untouched. */
export const remove = mutation({
  args: { boutId: v.id("bouts") },
  handler: async (ctx, { boutId }) => {
    const bout = await ctx.db.get(boutId);
    if (!bout) throw new Error("Bout not found.");
    await loadRoom(ctx, bout.roomId);

    const votes = await ctx.db
      .query("boutVotes")
      .withIndex("by_bout", (q) => q.eq("boutId", boutId))
      .collect();
    for (const vote of votes) await ctx.db.delete(vote._id);

    await ctx.db.delete(boutId);
  },
});
