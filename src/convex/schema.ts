import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// Who is at the table. Humans and agents sit as peers, so the record keeps
// the distinction without ranking it.
export const contributorKindValidator = v.union(
  v.literal("human"),
  v.literal("agent"),
);
export type ContributorKind = Infer<typeof contributorKindValidator>;

// Where the meeting is in its lifecycle. See protocol.ts for the copy and
// the rules for what each stage allows.
export const stageValidator = v.union(
  v.literal("open"),
  v.literal("assessment"),
  v.literal("authorized"),
);

// What kind of contribution this is. Brands and names are first-class here.
export const trackValidator = v.union(
  v.literal("concept"),
  v.literal("brand"),
  v.literal("market"),
  v.literal("wild"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // A sealed room. Ideas enter, ideas do not leave.
    rooms: defineTable({
      ownerId: v.id("users"),
      title: v.string(),
      premise: v.string(),
      isExample: v.optional(v.boolean()),
      // absent on rooms created before stages existed; treat as "open"
      stage: v.optional(stageValidator),
      // true once the sealed pool has been shown to the room. Reopening the
      // floor does not re-blind contributions everyone has already seen.
      revealed: v.optional(v.boolean()),
    }).index("by_owner", ["ownerId"]),

    // An unannounced proposal, put on the table by a human or an agent.
    ideas: defineTable({
      roomId: v.id("rooms"),
      title: v.string(),
      thesis: v.string(),
      contributor: v.string(),
      kind: contributorKindValidator,
      track: v.optional(trackValidator),
      // set when this is someone building on an earlier contribution
      parentId: v.optional(v.id("ideas")),
      // assigned only after the room is authorized
      steward: v.optional(v.string()),
      stewardKind: v.optional(contributorKindValidator),
      // exploration and delivery are tracked as different commitments
      assignmentMode: v.optional(
        v.union(v.literal("explore"), v.literal("deliver")),
      ),
      // the runscore band this assignment is judged against, declared up front
      bar: v.optional(
        v.union(
          v.literal("provisional"),
          v.literal("viable"),
          v.literal("runaway"),
        ),
      ),
      // the asset it actually pulls on. Bootstraps are named, not implied.
      bootstrap: v.optional(v.string()),
      // a hybrid carries both lineages, and starts unscored like everything else
      bredFrom: v.optional(v.array(v.id("ideas"))),
    }).index("by_room", ["roomId"]),

    // One scoring pass over one idea: four 0–10 dimensions plus rationale.
    assessments: defineTable({
      roomId: v.id("rooms"),
      ideaId: v.id("ideas"),
      novelty: v.number(),
      warrant: v.number(),
      reach: v.number(),
      drag: v.number(),
      note: v.optional(v.string()),
      contributor: v.string(),
      kind: contributorKindValidator,
      // Precedent says it probably fails; the upside is not linear. Flagged
      // beside the score, never added to it.
      asymmetric: v.optional(v.boolean()),
    })
      .index("by_idea", ["ideaId"])
      .index("by_room", ["roomId"]),

    // Company, not consensus: one nod or pushback per seat per idea. Never
    // counted in the runscore and never used to order the table.
    nods: defineTable({
      roomId: v.id("rooms"),
      ideaId: v.id("ideas"),
      contributor: v.string(),
      kind: contributorKindValidator,
      stance: v.union(v.literal("nod"), v.literal("push")),
    })
      .index("by_idea", ["ideaId"])
      .index("by_room", ["roomId"]),

    // Declared source material: a link or a file, plus what it is for. The
    // room does not pretend nothing came in from outside. It requires the
    // room to see it, labelled, with an author.
    sources: defineTable({
      roomId: v.id("rooms"),
      ideaId: v.optional(v.id("ideas")),
      kind: v.union(v.literal("link"), v.literal("file")),
      name: v.string(),
      url: v.optional(v.string()),
      storageId: v.optional(v.id("_storage")),
      note: v.optional(v.string()),
      // "prior": someone has already built this. "context": background only.
      declared: v.union(v.literal("prior"), v.literal("context")),
      contributor: v.string(),
    })
      .index("by_room", ["roomId"])
      .index("by_idea", ["ideaId"]),

    // A seat speaking from a chair. The board is a set of lenses, not a panel
    // of authorities: a reading is an argument on the record, never a score.
    readings: defineTable({
      roomId: v.id("rooms"),
      ideaId: v.id("ideas"),
      chair: v.string(),
      body: v.string(),
      contributor: v.string(),
      kind: contributorKindValidator,
    })
      .index("by_room", ["roomId"])
      .index("by_idea", ["ideaId"]),

    // Head to head. A bout never moves a runscore; it produces a call with
    // the dissent still attached to it.
    bouts: defineTable({
      roomId: v.id("rooms"),
      aId: v.id("ideas"),
      bId: v.id("ideas"),
      question: v.string(),
      status: v.union(v.literal("open"), v.literal("called")),
      winnerId: v.optional(v.id("ideas")),
      rationale: v.optional(v.string()),
      calledBy: v.optional(v.string()),
      createdBy: v.string(),
    }).index("by_room", ["roomId"]),

    boutVotes: defineTable({
      boutId: v.id("bouts"),
      roomId: v.id("rooms"),
      contributor: v.string(),
      kind: contributorKindValidator,
      side: v.union(v.literal("a"), v.literal("b"), v.literal("draw")),
      forCase: v.optional(v.string()),
      againstCase: v.optional(v.string()),
    }).index("by_bout", ["boutId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
