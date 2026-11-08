import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isRevealed } from "./protocol";

const declaredValidator = v.union(v.literal("prior"), v.literal("context"));

/** Resolve the signed-in seat and confirm the room belongs to them. */
async function loadRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to declare a source.");
  const room = await ctx.db.get(roomId);
  if (!room || room.ownerId !== userId) throw new Error("Room not found.");
  const user = await ctx.db.get(userId);
  const seat = (user?.name ?? user?.email ?? "A seat").trim().slice(0, 60);
  return { room, userId, seat };
}

/**
 * A direct upload URL. Files live in Convex storage, next to the room they
 * belong to — no outside bucket and no extra key to manage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to declare a source.");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Declare something the room should be able to point at: a link or a file,
 * labelled as prior art or context, never silently absorbed into the idea.
 */
export const attach = mutation({
  args: {
    roomId: v.id("rooms"),
    ideaId: v.optional(v.id("ideas")),
    kind: v.union(v.literal("link"), v.literal("file")),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    note: v.optional(v.string()),
    declared: declaredValidator,
  },
  handler: async (ctx, args) => {
    const { room, seat } = await loadRoom(ctx, args.roomId);

    let href: string | undefined;
    if (args.kind === "link") {
      const raw = args.url?.trim() ?? "";
      if (!raw) throw new Error("A link needs an address.");
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        throw new Error("That does not read as a web address.");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http and https links can be declared.");
      }
      href = parsed.toString();
    } else if (!args.storageId) {
      throw new Error("Choose a file to upload first.");
    }

    if (args.ideaId) {
      const idea = await ctx.db.get(args.ideaId);
      if (!idea || idea.roomId !== args.roomId) {
        throw new Error("That idea isn't on this table.");
      }
      if (!isRevealed(room)) {
        throw new Error(
          "The pool is sealed. Point at sources once there is something to point at.",
        );
      }
    }

    const name = (
      args.name?.trim() ||
      (args.kind === "link" ? href : "Untitled file") ||
      "Untitled source"
    ).slice(0, 120);

    return await ctx.db.insert("sources", {
      roomId: args.roomId,
      ideaId: args.ideaId,
      kind: args.kind,
      name,
      url: href,
      storageId: args.kind === "file" ? args.storageId : undefined,
      note: args.note?.trim().slice(0, 240) || undefined,
      declared: args.declared,
      contributor: seat,
    });
  },
});

/** Remove a declaration, and the stored file if there was one. */
export const remove = mutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) throw new Error("Source not found.");
    await loadRoom(ctx, source.roomId);

    if (source.storageId) await ctx.storage.delete(source.storageId);
    await ctx.db.delete(sourceId);
  },
});
