// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Inactivity threshold: 30 minutes in milliseconds
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// ─── Query: Get Active Session ──────────────────────────────────────────────
export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("widget_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return session;
  },
});

// ─── Mutation: Get or Create Session with Auto-Expiry ────────────────────────
export const getOrCreateSession = mutation({
  args: {
    sessionId: v.string(),
    visitorId: v.string(),
    orgId: v.string(),
    browserInfo: v.object({
      userAgent: v.string(),
      language: v.string(),
      screenResolution: v.string(),
    }),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Fetch or create visitor profile
    const visitor = await ctx.db
      .query("visitor_profiles")
      .withIndex("by_visitor_id", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (visitor) {
      await ctx.db.patch(visitor._id, {
        lastSeenAt: now,
        userAgent: args.browserInfo.userAgent,
      });
    } else {
      await ctx.db.insert("visitor_profiles", {
        visitorId: args.visitorId,
        firstSeenAt: now,
        lastSeenAt: now,
        userAgent: args.browserInfo.userAgent,
        metadata: args.metadata,
      });
    }

    // 2. Fetch existing session
    const session = await ctx.db
      .query("widget_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      // Check for auto-expiry
      if (session.status === "active" && now - session.lastActiveAt > INACTIVITY_TIMEOUT) {
        // Expire the old session
        await ctx.db.patch(session._id, {
          status: "expired",
          lastActiveAt: now,
        });

        // Generate a new sessionId (client will handle storing this)
        const newSessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
        const newSessionDbId = await ctx.db.insert("widget_sessions", {
          sessionId: newSessionId,
          visitorId: args.visitorId,
          orgId: args.orgId,
          status: "active",
          createdAt: now,
          lastActiveAt: now,
          browserInfo: args.browserInfo,
          metadata: args.metadata,
          typingStatus: "idle",
        });

        const newSession = await ctx.db.get(newSessionDbId);
        return { session: newSession, expired: true };
      }

      // Session is active and fresh, update last active
      if (session.status === "active") {
        await ctx.db.patch(session._id, {
          lastActiveAt: now,
        });
      }
      return { session: { ...session, lastActiveAt: now }, expired: false };
    }

    // 3. Create a brand new session
    const newSessionDbId = await ctx.db.insert("widget_sessions", {
      sessionId: args.sessionId,
      visitorId: args.visitorId,
      orgId: args.orgId,
      status: "active",
      createdAt: now,
      lastActiveAt: now,
      browserInfo: args.browserInfo,
      metadata: args.metadata,
      typingStatus: "idle",
    });

    const newSession = await ctx.db.get(newSessionDbId);
    return { session: newSession, expired: false };
  },
});

// ─── Query: Get Messages for Session ─────────────────────────────────────────
export const getMessages = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("widget_messages")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Sort by timestamp
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// ─── Mutation: Add Message ───────────────────────────────────────────────────
export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    sender: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Insert message
    const msgId = await ctx.db.insert("widget_messages", {
      sessionId: args.sessionId,
      sender: args.sender,
      text: args.text,
      time: args.time,
      timestamp: now,
    });

    // 2. Update session's lastActiveAt
    const session = await ctx.db
      .query("widget_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        lastActiveAt: now,
      });
    }

    return msgId;
  },
});

// ─── Mutation: Update Typing Status ──────────────────────────────────────────
export const updateTypingStatus = mutation({
  args: {
    sessionId: v.string(),
    typingStatus: v.union(v.literal("idle"), v.literal("typing")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("widget_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        typingStatus: args.typingStatus,
      });
      return true;
    }
    return false;
  },
});
