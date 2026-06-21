import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Existing ──────────────────────────────────────────────────────────────
  users: defineTable({
    name: v.string(),
  }),

  // ─── Voice Sessions ────────────────────────────────────────────────────────
  voice_sessions: defineTable({
    // Identity
    userId: v.string(),                    // Clerk user ID
    vapiCallId: v.optional(v.string()),    // VAPI call ID (set after call starts)

    // AI configuration
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("grok"),
    ),
    assistantId: v.optional(v.string()),   // VAPI assistant ID if pre-configured

    // Lifecycle
    status: v.union(
      v.literal("idle"),
      v.literal("connecting"),
      v.literal("active"),
      v.literal("ended"),
      v.literal("failed"),
    ),
    startedAt: v.optional(v.number()),     // Unix ms
    endedAt:   v.optional(v.number()),     // Unix ms
    durationMs: v.optional(v.number()),    // endedAt - startedAt

    // Metadata
    endReason: v.optional(v.string()),     // "hangup" | "timeout" | "error" | "network"
    errorMessage: v.optional(v.string()),
    reconnectCount: v.number(),            // how many times user reconnected
  })
    .index("by_user",   ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // ─── Voice Messages (Transcript) ───────────────────────────────────────────
  voice_messages: defineTable({
    sessionId: v.id("voice_sessions"),
    userId: v.string(),

    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),                   // transcript text
    timestampMs: v.number(),               // wall-clock time of utterance

    // Optional STT / TTS metadata
    confidence: v.optional(v.number()),    // STT confidence 0-1
    durationMs: v.optional(v.number()),    // how long the utterance lasted
  })
    .index("by_session",      ["sessionId"])
    .index("by_user",         ["userId"])
    .index("by_session_role", ["sessionId", "role"]),

  // ─── Support Widget Sessions ────────────────────────────────────────────────
  widget_sessions: defineTable({
    sessionId: v.string(),
    visitorId: v.string(),
    orgId: v.string(),
    status: v.union(v.literal("active"), v.literal("expired")),
    lastActiveAt: v.number(),
    createdAt: v.number(),
    browserInfo: v.object({
      userAgent: v.string(),
      language: v.string(),
      screenResolution: v.string(),
    }),
    metadata: v.optional(v.string()),
    typingStatus: v.union(v.literal("idle"), v.literal("typing")),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_visitor_id", ["visitorId"])
    .index("by_org_id", ["orgId"])
    .index("by_status", ["status"]),

  // ─── Visitor Profiles ───────────────────────────────────────────────────────
  visitor_profiles: defineTable({
    visitorId: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    userAgent: v.string(),
    metadata: v.optional(v.string()),
  })
    .index("by_visitor_id", ["visitorId"]),

  // ─── Widget Messages ────────────────────────────────────────────────────────
  widget_messages: defineTable({
    sessionId: v.string(),
    sender: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    time: v.string(),
    timestamp: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  // ─── Platform Conversations Engine ─────────────────────────────────────────
  conversations: defineTable({
    orgId: v.string(),
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting")),
    isArchived: v.boolean(),
    isPinned: v.boolean(),
    lastMessageText: v.string(),
    lastMessageTimestamp: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_status", ["status"])
    .index("by_archived", ["isArchived"])
    .index("by_pinned", ["isPinned"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_archived", ["orgId", "isArchived"])
    .index("by_org_pinned", ["orgId", "isPinned"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    senderName: v.string(),
    senderType: v.union(v.literal("user"), v.literal("assistant"), v.literal("visitor")),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("voice"), v.literal("system")),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("read")),
    timestamp: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_conversation_timestamp", ["conversationId", "timestamp"]),

  participants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("agent"), v.literal("visitor")),
    joinedAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_user_id", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),
});
