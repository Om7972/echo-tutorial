import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Add a transcript message ─────────────────────────────────────────────────

export const addMessage = mutation({
  args: {
    sessionId:   v.id("voice_sessions"),
    userId:      v.string(),
    role:        v.union(v.literal("user"), v.literal("assistant")),
    content:     v.string(),
    timestampMs: v.optional(v.number()),
    confidence:  v.optional(v.number()),
    durationMs:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("voice_messages", {
      sessionId:   args.sessionId,
      userId:      args.userId,
      role:        args.role,
      content:     args.content,
      timestampMs: args.timestampMs ?? Date.now(),
      confidence:  args.confidence,
      durationMs:  args.durationMs,
    });
    return messageId;
  },
});

// ─── Get all messages for a session ──────────────────────────────────────────

export const getSessionMessages = query({
  args: { sessionId: v.id("voice_sessions") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("voice_messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

// ─── Get recent messages across all sessions for a user ──────────────────────

export const getRecentMessages = query({
  args: {
    userId: v.string(),
    limit:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("voice_messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 100);
  },
});
