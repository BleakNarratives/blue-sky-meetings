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
    }).index("by_owner", ["ownerId"]),

    // An unannounced proposal, put on the table by a human or an agent.
    ideas: defineTable({
      roomId: v.id("rooms"),
      title: v.string(),
      thesis: v.string(),
      contributor: v.string(),
      kind: contributorKindValidator,
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
    })
      .index("by_idea", ["ideaId"])
      .index("by_room", ["roomId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
