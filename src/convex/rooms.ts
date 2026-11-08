import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  aggregateRunscore,
  clampScore,
  type BandKey,
  type Dimensions,
} from "./runscore";
import { normaliseStage } from "./protocol";

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to enter a room.");
  return userId;
}

async function requireRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">,
) {
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  return room;
}

function emptyBandCounts(): Record<BandKey, number> {
  return { dormant: 0, provisional: 0, viable: 0, runaway: 0 };
}

/**
 * Every room the signed-in user keeps, with the readings the board needs:
 * how much is on the table, how much has been scored, and where the room
 * currently peaks.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    const summaries = [];
    for (const room of rooms) {
      const ideas = await ctx.db
        .query("ideas")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const bands = emptyBandCounts();
      const scored = ideas
        .map((idea) => ({
          idea,
          reading: aggregateRunscore(
            assessments
              .filter((a) => a.ideaId === idea._id)
              .map((a) => ({
                novelty: a.novelty,
                warrant: a.warrant,
                reach: a.reach,
                drag: a.drag,
              })),
          ),
        }))
        .filter((entry) => entry.reading !== null);

      for (const entry of scored) {
        if (entry.reading) bands[entry.reading.band.key] += 1;
      }

      const ranked = scored.sort(
        (a, b) => (b.reading?.score ?? 0) - (a.reading?.score ?? 0),
      );

      summaries.push({
        _id: room._id,
        title: room.title,
        premise: room.premise,
        stage: normaliseStage(room.stage),
        createdAt: room._creationTime,
        ideaCount: ideas.length,
        scoredCount: scored.length,
        bands,
        topScore: ranked[0]?.reading?.score ?? null,
        topIdea: ranked[0]?.idea.title ?? null,
      });
    }

    return summaries;
  },
});

/** One room, sealed, with every idea ranked by its current runscore. */
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const room = await ctx.db.get(roomId);
    if (!room || room.ownerId !== userId) return null;

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const byId = new Map(ideas.map((idea) => [idea._id, idea]));

    const rows = ideas.map((idea) => {
      const own = assessments
        .filter((a) => a.ideaId === idea._id)
        .sort((a, b) => a._creationTime - b._creationTime);
      const reading = aggregateRunscore(
        own.map((a) => ({
          novelty: a.novelty,
          warrant: a.warrant,
          reach: a.reach,
          drag: a.drag,
        })),
      );

      return {
        _id: idea._id,
        title: idea.title,
        thesis: idea.thesis,
        contributor: idea.contributor,
        kind: idea.kind,
        track: idea.track ?? "concept",
        parentId: idea.parentId ?? null,
        parentTitle: idea.parentId ? (byId.get(idea.parentId)?.title ?? null) : null,
        steward: idea.steward ?? null,
        stewardKind: idea.stewardKind ?? null,
        createdAt: idea._creationTime,
        score: reading?.score ?? null,
        bandKey: reading?.band.key ?? null,
        dimensions: reading?.dimensions ?? null,
        assessments: own.map((a) => ({
          _id: a._id,
          contributor: a.contributor,
          kind: a.kind,
          note: a.note ?? null,
          novelty: a.novelty,
          warrant: a.warrant,
          reach: a.reach,
          drag: a.drag,
          createdAt: a._creationTime,
        })),
      };
    });

    rows.sort((a, b) => {
      if (a.score === null && b.score === null) return a.createdAt - b.createdAt;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

    const bands = emptyBandCounts();
    let total = 0;
    let scored = 0;
    for (const row of rows) {
      if (row.score === null || row.bandKey === null) continue;
      bands[row.bandKey] += 1;
      total += row.score;
      scored += 1;
    }

    return {
      room: {
        _id: room._id,
        title: room.title,
        premise: room.premise,
        stage: normaliseStage(room.stage),
        createdAt: room._creationTime,
        isExample: room.isExample === true,
      },
      stats: {
        ideaCount: rows.length,
        scoredCount: scored,
        unscoredCount: rows.length - scored,
        averageScore: scored > 0 ? Math.round((total / scored) * 10) / 10 : null,
        bands,
      },
      ideas: rows,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    premise: v.string(),
  },
  handler: async (ctx, { title, premise }) => {
    const userId = await requireUserId(ctx);
    const cleanTitle = title.trim().slice(0, 90);
    if (cleanTitle.length < 2) throw new Error("Give the room a name.");

    return await ctx.db.insert("rooms", {
      ownerId: userId,
      title: cleanTitle,
      premise: premise.trim().slice(0, 400),
      stage: "open",
    });
  },
});

/**
 * Move the meeting one stage at a time. Forward: close the floor, then
 * authorize. Backward: reopen for more hearing, or return to assessment.
 * Nothing skips a step.
 */
export const setStage = mutation({
  args: {
    roomId: v.id("rooms"),
    stage: v.union(
      v.literal("open"),
      v.literal("assessment"),
      v.literal("authorized"),
    ),
  },
  handler: async (ctx, { roomId, stage }) => {
    const userId = await requireUserId(ctx);
    const room = await requireRoom(ctx, roomId, userId);

    const order = ["open", "assessment", "authorized"] as const;
    const current = normaliseStage(room.stage);
    const distance = Math.abs(order.indexOf(current) - order.indexOf(stage));

    if (distance !== 1) {
      throw new Error(
        "Stages move one step at a time. Close the floor, then authorize.",
      );
    }

    await ctx.db.patch(roomId, { stage });
    return stage;
  },
});

export const remove = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await requireUserId(ctx);
    await requireRoom(ctx, roomId, userId);

    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const assessment of assessments) await ctx.db.delete(assessment._id);

    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const idea of ideas) await ctx.db.delete(idea._id);

    await ctx.db.delete(roomId);
  },
});

/**
 * Seed room: the distributed ecosystem that started all of this — a Samsung
 * A9, a Chromebook, a Moto 4 and a backup drive, each holding a partial truth.
 * Useful as a demo and as a template for how disagreement reads on the board.
 */
export const createExample = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const roomId = await ctx.db.insert("rooms", {
      ownerId: userId,
      title: "Four devices, one truth",
      premise:
        "Four devices hold four partial versions of the same ecosystem. Nothing merges until the evidence survives the room.",
      isExample: true,
      stage: "assessment",
    });

    const seed: Array<{
      title: string;
      thesis: string;
      contributor: string;
      kind: "human" | "agent";
      track: "concept" | "brand" | "market" | "wild";
      parent?: string;
      assessments: Array<{
        contributor: string;
        kind: "human" | "agent";
        note?: string;
        d: Dimensions;
      }>;
    }> = [
      {
        title: "A single inventory, written once",
        thesis:
          "One ledger of every repo, script and agent. Absence becomes a recorded claim instead of a memory.",
        contributor: "M. Okafor",
        kind: "human",
        track: "concept",
        assessments: [
          {
            contributor: "M. Okafor",
            kind: "human",
            note: "Cheap to start: one file and a timestamp.",
            d: { novelty: 7, warrant: 8, reach: 9, drag: 3 },
          },
          {
            contributor: "atlas-4",
            kind: "agent",
            note: "Verifiable. Every entry can cite the device that reported it.",
            d: { novelty: 6, warrant: 9, reach: 8, drag: 4 },
          },
          {
            contributor: "lantern",
            kind: "agent",
            note: "Duplicate detection fails without hashes.",
            d: { novelty: 5, warrant: 7, reach: 9, drag: 5 },
          },
        ],
      },
      {
        title: "Hashes before the ledger",
        thesis:
          "Take the inventory one step further: hash every artifact and sign it with the device that produced it, so duplicate becomes a fact instead of an argument.",
        contributor: "lantern",
        kind: "agent",
        track: "concept",
        parent: "A single inventory, written once",
        assessments: [
          {
            contributor: "lantern",
            kind: "agent",
            note: "Adds one field and quietly ends most of the argument.",
            d: { novelty: 6, warrant: 8, reach: 9, drag: 3 },
          },
        ],
      },
      {
        title: "Reconcile on read, not on write",
        thesis:
          "Let each device keep its own model. Merge only when someone asks a question, so no device has to agree first.",
        contributor: "lantern",
        kind: "agent",
        track: "concept",
        assessments: [
          {
            contributor: "lantern",
            kind: "agent",
            d: { novelty: 8, warrant: 6, reach: 7, drag: 4 },
          },
          {
            contributor: "atlas-4",
            kind: "agent",
            note: "Elegant, but every consumer must understand four shapes.",
            d: { novelty: 8, warrant: 5, reach: 8, drag: 3 },
          },
          {
            contributor: "M. Okafor",
            kind: "human",
            note: "I like it. I do not have evidence it holds under conflict.",
            d: { novelty: 7, warrant: 5, reach: 6, drag: 6 },
          },
        ],
      },
      {
        title: "Repair the A9 before a fifth copy",
        thesis:
          "The broken sync on the Samsung is not a reason to rewrite. Fix the one path all four devices already share.",
        contributor: "M. Okafor",
        kind: "human",
        track: "concept",
        assessments: [
          {
            contributor: "M. Okafor",
            kind: "human",
            note: "The failure is reproducible. That is the only reason it is still on the table.",
            d: { novelty: 6, warrant: 9, reach: 8, drag: 2 },
          },
          {
            contributor: "atlas-4",
            kind: "agent",
            d: { novelty: 5, warrant: 8, reach: 7, drag: 3 },
          },
        ],
      },
      {
        title: "Rebuild the ecosystem as one monorepo",
        thesis:
          "Consolidate every repository into one tree so no version can drift again.",
        contributor: "atlas-4",
        kind: "agent",
        track: "wild",
        assessments: [
          {
            contributor: "atlas-4",
            kind: "agent",
            d: { novelty: 4, warrant: 4, reach: 3, drag: 9 },
          },
          {
            contributor: "M. Okafor",
            kind: "human",
            note: "Proposes a rewrite. Proposing is not permission.",
            d: { novelty: 2, warrant: 3, reach: 2, drag: 10 },
          },
          {
            contributor: "lantern",
            kind: "agent",
            note: "No migration path offered for the backup volume.",
            d: { novelty: 3, warrant: 2, reach: 4, drag: 9 },
          },
        ],
      },
    ];

    const created = new Map<string, Id<"ideas">>();

    for (const entry of seed) {
      const ideaId = await ctx.db.insert("ideas", {
        roomId,
        title: entry.title,
        thesis: entry.thesis,
        contributor: entry.contributor,
        kind: entry.kind,
        track: entry.track,
        parentId: entry.parent ? created.get(entry.parent) : undefined,
      });
      created.set(entry.title, ideaId);
      for (const assessment of entry.assessments) {
        await ctx.db.insert("assessments", {
          roomId,
          ideaId,
          novelty: clampScore(assessment.d.novelty),
          warrant: clampScore(assessment.d.warrant),
          reach: clampScore(assessment.d.reach),
          drag: clampScore(assessment.d.drag),
          note: assessment.note,
          contributor: assessment.contributor,
          kind: assessment.kind,
        });
      }
    }

    return roomId;
  },
});

