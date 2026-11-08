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
import { isRevealed, normaliseStage } from "./protocol";

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
        revealed: isRevealed(room),
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
    const nods = await ctx.db
      .query("nods")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const user = await ctx.db.get(userId);
    const seatName = (user?.name ?? user?.email ?? "").trim().toLowerCase();
    const sealed = !isRevealed(room);

    const sourceRows = [];
    const rawSources = await ctx.db
      .query("sources")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const source of rawSources.sort(
      (a, b) => b._creationTime - a._creationTime,
    )) {
      // While the pool is sealed, only room-level context is visible.
      if (sealed && source.ideaId !== undefined) continue;
      sourceRows.push({
        _id: source._id,
        ideaId: source.ideaId ?? null,
        kind: source.kind,
        name: source.name,
        href:
          source.kind === "file" && source.storageId
            ? await ctx.storage.getUrl(source.storageId)
            : (source.url ?? null),
        note: source.note ?? null,
        declared: source.declared,
        contributor: source.contributor,
        createdAt: source._creationTime,
      });
    }

    const readingRows = sealed
      ? []
      : (
          await ctx.db
            .query("readings")
            .withIndex("by_room", (q) => q.eq("roomId", roomId))
            .collect()
        )
          .sort((a, b) => a._creationTime - b._creationTime)
          .map((reading) => ({
            _id: reading._id,
            ideaId: reading.ideaId,
            chair: reading.chair,
            body: reading.body,
            contributor: reading.contributor,
            kind: reading.kind,
            createdAt: reading._creationTime,
          }));

    const rawBouts = sealed
      ? []
      : await ctx.db
          .query("bouts")
          .withIndex("by_room", (q) => q.eq("roomId", roomId))
          .collect();

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
        bredFromTitles: (idea.bredFrom ?? [])
          .map((id) => byId.get(id)?.title)
          .filter((title): title is string => Boolean(title)),
        bootstrap: idea.bootstrap ?? null,
        steward: idea.steward ?? null,
        stewardKind: idea.stewardKind ?? null,
        assignmentMode: idea.assignmentMode ?? null,
        bar:
          (idea.bar as "provisional" | "viable" | "runaway" | undefined) ??
          null,
        asymmetricSeats: own.filter((a) => a.asymmetric === true).length,
        nodCount: nods.filter(
          (n) => n.ideaId === idea._id && n.stance === "nod",
        ).length,
        pushCount: nods.filter(
          (n) => n.ideaId === idea._id && n.stance === "push",
        ).length,
        myStance:
          seatName.length > 0
            ? (nods.find(
                (n) =>
                  n.ideaId === idea._id &&
                  n.contributor.trim().toLowerCase() === seatName,
              )?.stance ?? null)
            : null,
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
          asymmetric: a.asymmetric === true,
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

    const rowById = new Map(rows.map((row) => [row._id, row]));
    const boutRows = [];
    for (const bout of rawBouts.sort(
      (a, b) => b._creationTime - a._creationTime,
    )) {
      const a = rowById.get(bout.aId);
      const b = rowById.get(bout.bId);
      if (!a || !b) continue;
      const ballots = await ctx.db
        .query("boutVotes")
        .withIndex("by_bout", (q) => q.eq("boutId", bout._id))
        .collect();
      boutRows.push({
        _id: bout._id,
        question: bout.question,
        status: bout.status,
        winnerSide:
          bout.winnerId === undefined
            ? null
            : bout.winnerId === bout.aId
              ? ("a" as const)
              : ("b" as const),
        rationale: bout.rationale ?? null,
        calledBy: bout.calledBy ?? null,
        createdBy: bout.createdBy,
        createdAt: bout._creationTime,
        a: { id: a._id, title: a.title, track: a.track, score: a.score },
        b: { id: b._id, title: b.title, track: b.track, score: b.score },
        ballots: ballots
          .sort((x, y) => x._creationTime - y._creationTime)
          .map((ballot) => ({
            _id: ballot._id,
            contributor: ballot.contributor,
            kind: ballot.kind,
            side: ballot.side,
            forCase: ballot.forCase ?? null,
            againstCase: ballot.againstCase ?? null,
          })),
        mySide:
          seatName.length > 0
            ? (ballots.find(
                (ballot) =>
                  ballot.contributor.trim().toLowerCase() === seatName,
              )?.side ?? null)
            : null,
        myBallot: (() => {
          if (seatName.length === 0) return null;
          const mine = ballots.find(
            (ballot) => ballot.contributor.trim().toLowerCase() === seatName,
          );
          return mine
            ? {
                side: mine.side,
                forCase: mine.forCase ?? null,
                againstCase: mine.againstCase ?? null,
              }
            : null;
        })(),
      });
    }

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
      sealed,
      poolSize: rows.length,
      stats: {
        ideaCount: rows.length,
        scoredCount: scored,
        unscoredCount: rows.length - scored,
        averageScore: scored > 0 ? Math.round((total / scored) * 10) / 10 : null,
        bands,
      },
      ideas: sealed ? [] : rows,
      sources: sourceRows,
      readings: readingRows,
      bouts: boutRows,
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

    // The first look at the pool is the reveal, and it is permanent: reopening
    // the floor later does not re-blind what everyone has already seen.
    await ctx.db.patch(
      roomId,
      stage === "open" ? { stage } : { stage, revealed: true },
    );
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

    const nods = await ctx.db
      .query("nods")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const nod of nods) await ctx.db.delete(nod._id);

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const source of sources) {
      if (source.storageId) await ctx.storage.delete(source.storageId);
      await ctx.db.delete(source._id);
    }

    const readings = await ctx.db
      .query("readings")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const reading of readings) await ctx.db.delete(reading._id);

    const bouts = await ctx.db
      .query("bouts")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const bout of bouts) {
      const votes = await ctx.db
        .query("boutVotes")
        .withIndex("by_bout", (q) => q.eq("boutId", bout._id))
        .collect();
      for (const vote of votes) await ctx.db.delete(vote._id);
      await ctx.db.delete(bout._id);
    }

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
      revealed: true,
    });

    const seed: Array<{
      title: string;
      thesis: string;
      contributor: string;
      kind: "human" | "agent";
      track: "concept" | "brand" | "market" | "wild";
      parent?: string;
      bredFrom?: string[];
      bootstrap?: string;
      assessments: Array<{
        contributor: string;
        kind: "human" | "agent";
        note?: string;
        asymmetric?: boolean;
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
        bootstrap: "Four devices already in the room, and a habit of keeping notes.",
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
        bootstrap: "One extra field, and a hash function that already exists.",
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
        bootstrap: "Every device keeping its own model, which they already do.",
        assessments: [
          {
            contributor: "lantern",
            kind: "agent",
            asymmetric: true,
            d: { novelty: 8, warrant: 6, reach: 7, drag: 4 },
          },
          {
            contributor: "atlas-4",
            kind: "agent",
            note: "Elegant, but every consumer must understand four shapes.",
            asymmetric: true,
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
        bootstrap: "A failure that reproduces on demand.",
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
        bootstrap: "Nothing yet. That is the whole problem with it.",
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
      {
        title: "A signed inventory that shows its own diff",
        thesis:
          "Keep the signed history, not just the ledger. A merge becomes a review: every claim carries the device that made it and the version it replaced.",
        contributor: "lantern",
        kind: "agent",
        track: "concept",
        bredFrom: [
          "A single inventory, written once",
          "Hashes before the ledger",
        ],
        bootstrap: "Two ideas the room already argued about.",
        assessments: [
          {
            contributor: "lantern",
            kind: "agent",
            note: "Scored on its own merits, not because its parents scored well.",
            d: { novelty: 7, warrant: 7, reach: 8, drag: 4 },
          },
          {
            contributor: "atlas-4",
            kind: "agent",
            note: "A signed history is cheap to write and expensive to explain to every consumer.",
            d: { novelty: 6, warrant: 6, reach: 7, drag: 5 },
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
        bredFrom: entry.bredFrom
          ?.map((title) => created.get(title))
          .filter((id): id is Id<"ideas"> => Boolean(id)),
        bootstrap: entry.bootstrap,
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
          asymmetric: assessment.asymmetric === true,
        });
      }
    }

    const nodSeed: Array<{
      idea: string;
      stance: "nod" | "push";
      contributor: string;
      kind: "human" | "agent";
    }> = [
      { idea: "A single inventory, written once", stance: "nod", contributor: "atlas-4", kind: "agent" },
      { idea: "A single inventory, written once", stance: "nod", contributor: "lantern", kind: "agent" },
      { idea: "Hashes before the ledger", stance: "nod", contributor: "atlas-4", kind: "agent" },
      { idea: "Hashes before the ledger", stance: "nod", contributor: "M. Okafor", kind: "human" },
      { idea: "Reconcile on read, not on write", stance: "nod", contributor: "M. Okafor", kind: "human" },
      { idea: "Reconcile on read, not on write", stance: "push", contributor: "atlas-4", kind: "agent" },
      { idea: "Repair the A9 before a fifth copy", stance: "nod", contributor: "lantern", kind: "agent" },
      { idea: "Rebuild the ecosystem as one monorepo", stance: "push", contributor: "M. Okafor", kind: "human" },
      { idea: "Rebuild the ecosystem as one monorepo", stance: "push", contributor: "lantern", kind: "agent" },
    ];

    for (const nod of nodSeed) {
      const ideaId = created.get(nod.idea);
      if (!ideaId) continue;
      await ctx.db.insert("nods", {
        roomId,
        ideaId,
        contributor: nod.contributor,
        kind: nod.kind,
        stance: nod.stance,
      });
    }

    // Declared source material: real links, labelled, attributed. Nothing is
    // smuggled into a sealed room and then treated as common knowledge.
    const sourceSeed: Array<{
      idea: string | null;
      name: string;
      url: string;
      note?: string;
      declared: "prior" | "context";
      contributor: string;
    }> = [
      {
        idea: null,
        name: "Content-addressable storage",
        url: "https://en.wikipedia.org/wiki/Content-addressable_storage",
        note: "Background for the hashing thread. Context, not a claim.",
        declared: "context",
        contributor: "lantern",
      },
      {
        idea: "Hashes before the ledger",
        name: "Cryptographic hash function",
        url: "https://en.wikipedia.org/wiki/Cryptographic_hash_function",
        note: "Prior art. Nothing here is novel at the primitive level.",
        declared: "prior",
        contributor: "atlas-4",
      },
      {
        idea: null,
        name: "Conflict-free replicated data types",
        url: "https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type",
        note: "The option nobody has costed yet.",
        declared: "prior",
        contributor: "M. Okafor",
      },
    ];

    for (const source of sourceSeed) {
      await ctx.db.insert("sources", {
        roomId,
        ideaId: source.idea ? created.get(source.idea) : undefined,
        kind: "link",
        name: source.name,
        url: source.url,
        note: source.note,
        declared: source.declared,
        contributor: source.contributor,
      });
    }

    // The board in session: chairs, not authorities.
    const readingSeed: Array<{
      idea: string;
      chair: string;
      body: string;
      contributor: string;
      kind: "human" | "agent";
    }> = [
      {
        idea: "Reconcile on read, not on write",
        chair: "chair",
        body: "The question is not whether it is elegant. It is whether four consumers can be wrong differently without anyone noticing.",
        contributor: "M. Okafor",
        kind: "human",
      },
      {
        idea: "Reconcile on read, not on write",
        chair: "skeptic",
        body: "Every consumer must understand four shapes. That is four chances to bend the truth quietly.",
        contributor: "atlas-4",
        kind: "agent",
      },
      {
        idea: "Reconcile on read, not on write",
        chair: "market",
        body: "Nobody has named a budget. The people who feel the pain are not the people who sign for the fix.",
        contributor: "lantern",
        kind: "agent",
      },
      {
        idea: "Repair the A9 before a fifth copy",
        chair: "advocate",
        body: "It is the only proposal with a reproducible failure and a bounded fix. That is not modesty. That is evidence.",
        contributor: "M. Okafor",
        kind: "human",
      },
      {
        idea: "A signed inventory that shows its own diff",
        chair: "operator",
        body: "A signed history is cheap to write and expensive to explain to every consumer. Budget the explaining.",
        contributor: "atlas-4",
        kind: "agent",
      },
    ];

    for (const reading of readingSeed) {
      const ideaId = created.get(reading.idea);
      if (!ideaId) continue;
      await ctx.db.insert("readings", {
        roomId,
        ideaId,
        chair: reading.chair,
        body: reading.body,
        contributor: reading.contributor,
        kind: reading.kind,
      });
    }

    // One bout, already called, so the arena shows both a tally and a dissent.
    const aId = created.get("Repair the A9 before a fifth copy");
    const bId = created.get("Reconcile on read, not on write");
    if (aId && bId) {
      const boutId = await ctx.db.insert("bouts", {
        roomId,
        aId,
        bId,
        question: "Which survives six more months of drift?",
        status: "called",
        winnerId: aId,
        rationale:
          "The failure is reproducible today and the fix is bounded. Reconcile is a bet on behaviour we have not seen; it should be bred, not assigned.",
        calledBy: "M. Okafor",
        createdBy: "lantern",
      });

      const ballotSeed: Array<{
        side: "a" | "b" | "draw";
        contributor: string;
        kind: "human" | "agent";
        forCase: string;
        againstCase: string;
      }> = [
        {
          side: "a",
          contributor: "M. Okafor",
          kind: "human",
          forCase: "Reproducible failure, one path, four devices already share it.",
          againstCase: "Does not settle the next disagreement.",
        },
        {
          side: "b",
          contributor: "atlas-4",
          kind: "agent",
          forCase: "Removes the need for a shared write model entirely.",
          againstCase: "Four shapes, four chances to misread.",
        },
        {
          side: "draw",
          contributor: "lantern",
          kind: "agent",
          forCase: "Both buy time, and time is the actual constraint.",
          againstCase: "Only one of them can be tested this month.",
        },
      ];

      for (const ballot of ballotSeed) {
        await ctx.db.insert("boutVotes", {
          boutId,
          roomId,
          contributor: ballot.contributor,
          kind: ballot.kind,
          side: ballot.side,
          forCase: ballot.forCase,
          againstCase: ballot.againstCase,
        });
      }
    }

    return roomId;
  },
});

