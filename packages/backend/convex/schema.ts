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
    // New fields for operator dashboard
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    tags: v.array(v.string()),
    assigneeId: v.optional(v.string()), // User ID or "team" or null (unassigned)
    slaDeadline: v.optional(v.number()), // Unix timestamp for SLA
  })
    .index("by_org_id", ["orgId"])
    .index("by_status", ["status"])
    .index("by_archived", ["isArchived"])
    .index("by_pinned", ["isPinned"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_archived", ["orgId", "isArchived"])
    .index("by_org_pinned", ["orgId", "isPinned"])
    .index("by_org_priority", ["orgId", "priority"])
    .index("by_org_assignee", ["orgId", "assigneeId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    senderName: v.string(),
    senderType: v.union(v.literal("user"), v.literal("assistant"), v.literal("visitor")),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("voice"), v.literal("system"), v.literal("attachment"), v.literal("internal_note"), v.literal("quick_reply")),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("read")),
    timestamp: v.number(),
    // New fields for premium features
    isInternal: v.optional(v.boolean()), // internal note flag
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      userId: v.string(),
      timestamp: v.number(),
    }))),
    replyToId: v.optional(v.id("messages")), // for replies
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(), // image/png, application/pdf, etc.
      size: v.number(),
      url: v.string(),
      storageId: v.id("_storage"),
    }))),
    mentions: v.optional(v.array(v.string())), // user IDs
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_conversation_timestamp", ["conversationId", "timestamp"]),

  participants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("agent"), v.literal("visitor")),
    joinedAt: v.number(),
    typingStatus: v.optional(v.union(v.literal("idle"), v.literal("typing"))),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_user_id", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // ─── Premium Chat Features ─────────────────────────────────────────────────
  message_reactions: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.string(),
    emoji: v.string(),
    timestamp: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_message_user", ["messageId", "userId"]),

  pinned_messages: defineTable({
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    pinnedById: v.string(),
    pinnedAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"]),

  internal_notes: defineTable({
    conversationId: v.id("conversations"),
    note: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    timestamp: v.number(),
  })
    .index("by_conversation_id", ["conversationId"]),

  customer_profiles: defineTable({
    orgId: v.string(),
    visitorId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
    customFields: v.optional(v.object({})),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_visitor", ["orgId", "visitorId"]),

  quick_replies: defineTable({
    orgId: v.string(),
    text: v.string(),
    shortcut: v.optional(v.string()),
    category: v.optional(v.string()),
  })
    .index("by_org_id", ["orgId"]),

  typing_statuses: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    userName: v.string(),
    isTyping: v.boolean(),
    lastUpdatedAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"]),
});
