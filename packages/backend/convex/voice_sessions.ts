import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Create a new voice session ──────────────────────────────────────────────

export const createSession = mutation({
  args: {
    userId:   v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("grok")),
    assistantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("voice_sessions", {
      userId:         args.userId,
      provider:       args.provider,
      assistantId:    args.assistantId,
      status:         "connecting",
      reconnectCount: 0,
    });
    return sessionId;
  },
});

// ─── Mark session as active (call connected) ─────────────────────────────────

export const startSession = mutation({
  args: {
    sessionId: v.id("voice_sessions"),
    vapiCallId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status:    "active",
      vapiCallId: args.vapiCallId,
      startedAt: Date.now(),
    });
  },
});

// ─── End a session ───────────────────────────────────────────────────────────

export const endSession = mutation({
  args: {
    sessionId:    v.id("voice_sessions"),
    endReason:    v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    const endedAt   = Date.now();
    const durationMs = session.startedAt ? endedAt - session.startedAt : 0;

    await ctx.db.patch(args.sessionId, {
      status:       "ended",
      endedAt,
      durationMs,
      endReason:    args.endReason,
      errorMessage: args.errorMessage,
    });
  },
});

// ─── Mark session as failed ───────────────────────────────────────────────────

export const failSession = mutation({
  args: {
    sessionId:    v.id("voice_sessions"),
    errorMessage: v.string(),
    endReason:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status:       "failed",
      endedAt:      Date.now(),
      errorMessage: args.errorMessage,
      endReason:    args.endReason ?? "error",
    });
  },
});

// ─── Increment reconnect counter ─────────────────────────────────────────────

export const incrementReconnect = mutation({
  args: { sessionId: v.id("voice_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ctx.db.patch(args.sessionId, {
      reconnectCount: session.reconnectCount + 1,
      status: "connecting",
    });
  },
});

// ─── Get a single session ─────────────────────────────────────────────────────

export const getSession = query({
  args: { sessionId: v.id("voice_sessions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.sessionId);
  },
});

// ─── List all sessions for a user (most recent first) ────────────────────────

export const listSessionsByUser = query({
  args: {
    userId: v.string(),
    limit:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("voice_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);
    return sessions;
  },
});

// ─── Analytics: stats for a user ────────────────────────────────────────────

export const getAnalytics = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("voice_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const ended   = sessions.filter((s) => s.status === "ended");
    const failed  = sessions.filter((s) => s.status === "failed");
    const totalMs = ended.reduce((acc, s) => acc + (s.durationMs ?? 0), 0);
    const avgMs   = ended.length ? Math.round(totalMs / ended.length) : 0;

    // Provider breakdown
    const byProvider: Record<string, number> = {};
    for (const s of sessions) {
      byProvider[s.provider] = (byProvider[s.provider] ?? 0) + 1;
    }

    return {
      totalSessions: sessions.length,
      completedCalls: ended.length,
      failedCalls: failed.length,
      totalDurationMs: totalMs,
      averageDurationMs: avgMs,
      byProvider,
    };
  },
});
