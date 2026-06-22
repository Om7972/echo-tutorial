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

  conversations: defineTable({
    orgId: v.string(),
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting")),
    isArchived: v.boolean(),
    isPinned: v.boolean(),
    lastMessageText: v.string(),
    lastMessageTimestamp: v.number(),
    createdAt: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    tags: v.array(v.string()),
    assigneeId: v.optional(v.string()), // User ID or "team" or null (unassigned)
    slaDeadline: v.optional(v.number()), // Unix timestamp for SLA
    isLocked: v.optional(v.boolean()),
    lockedBy: v.optional(v.string()),
    lockedAt: v.optional(v.number()),
    escalationReason: v.optional(v.string()),
    escalatedAt: v.optional(v.number()),
    firstResponseTimeMs: v.optional(v.number()),
    resolutionTimeMs: v.optional(v.number()),
    csatScore: v.optional(v.number()),
    isResolvedByAI: v.optional(v.boolean()),
    tokensUsed: v.optional(v.number()),
    costUSD: v.optional(v.number()),
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
    .index("by_conversation_id", ["conversationId"])
    .index("by_message_id", ["messageId"]),

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

  // ─── AI Function Calling ────────────────────────────────────────────────────
  tool_calls: defineTable({
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    userId: v.optional(v.string()),
    toolName: v.string(),
    arguments: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("fallback")
    ),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    cost: v.optional(v.number()), // in USD cents
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_tool_name", ["toolName"])
    .index("by_org_date", ["orgId", "startedAt"]),

  tool_results: defineTable({
    toolCallId: v.id("tool_calls"),
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    toolName: v.string(),
    result: v.any(),
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
    executionTimeMs: v.optional(v.number()),
  })
    .index("by_tool_call_id", ["toolCallId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_date", ["orgId", "timestamp"]),

  tool_audit_logs: defineTable({
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    toolCallId: v.optional(v.id("tool_calls")),
    event: v.union(
      v.literal("tool_call_initiated"),
      v.literal("tool_validation_failed"),
      v.literal("tool_execution_started"),
      v.literal("tool_execution_completed"),
      v.literal("tool_execution_failed"),
      v.literal("fallback_triggered"),
      v.literal("result_stored")
    ),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_tool_call_id", ["toolCallId"])
    .index("by_event", ["event"]),

  cost_metrics: defineTable({
    orgId: v.string(),
    date: v.string(), // ISO date (YYYY-MM-DD)
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    totalCost: v.number(), // in USD cents
    totalCalls: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_date", ["orgId", "date"])
    .index("by_org_provider", ["orgId", "provider"]),

  // ─── Knowledge Base ─────────────────────────────────────────────────────────
  knowledge_base: defineTable({
    orgId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_category", ["orgId", "category"]),

  // ─── Smart Knowledge Base ──────────────────────────────────────────────────
  documents: defineTable({
    orgId: v.string(),
    title: v.string(),
    fileName: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("indexed"),
      v.literal("failed")
    ),
    version: v.number(),
    category: v.optional(v.string()),
    summary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_category", ["orgId", "category"]),

  chunks: defineTable({
    orgId: v.string(),
    documentId: v.id("documents"),
    text: v.string(),
    index: v.number(),
    createdAt: v.number(),
  })
    .index("by_document_id", ["documentId"])
    .index("by_org_id", ["orgId"]),

  embeddings: defineTable({
    orgId: v.string(),
    chunkId: v.id("chunks"),
    documentId: v.id("documents"),
    embedding: v.array(v.float64()),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["orgId"],
    })
    .index("by_chunk_id", ["chunkId"])
    .index("by_document_id", ["documentId"]),

  sources: defineTable({
    orgId: v.string(),
    documentId: v.id("documents"),
    url: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_document_id", ["documentId"]),

  transfer_history: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    fromAssignee: v.optional(v.string()),
    toAssignee: v.string(),
    transferredBy: v.string(),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"]),

  notifications: defineTable({
    orgId: v.string(),
    userId: v.optional(v.string()),
    title: v.string(),
    message: v.string(),
    conversationId: v.id("conversations"),
    type: v.union(v.literal("escalation"), v.literal("transfer"), v.literal("mention")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_user_id", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  audit_logs: defineTable({
    orgId: v.string(),
    userId: v.string(),
    action: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_date", ["orgId", "timestamp"]),

  // ─── Subscriptions & Billing ───────────────────────────────────────────────
  plans: defineTable({
    planId: v.string(), // "free", "pro", "business", "enterprise"
    name: v.string(),
    description: v.string(),
    priceMonthly: v.number(), // USD cents
    priceYearly: v.optional(v.number()),
    features: v.array(v.string()),
    limits: v.object({
      seats: v.number(),
      conversations: v.number(),
      aiMessages: v.number(),
      tokens: v.number(),
      kbDocuments: v.number(),
      apiCalls: v.number(),
      integrations: v.array(v.string()),
      customDomain: v.boolean(),
      sla: v.optional(v.string()),
    }),
    isPublic: v.boolean(),
    stripePriceIdMonthly: v.optional(v.string()),
    stripePriceIdYearly: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_plan_id", ["planId"])
    .index("by_public", ["isPublic"]),

  subscriptions: defineTable({
    orgId: v.string(),
    userId: v.optional(v.string()),
    planId: v.string(),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("paused"),
      v.literal("unpaid")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    cancelAt: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    couponId: v.optional(v.id("coupons")),
    trialEndsAt: v.optional(v.number()),
    gracePeriodEndsAt: v.optional(v.number()),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    metadata: v.optional(v.object({})),
    quantity: v.number(), // seats
  })
    .index("by_org_id", ["orgId"])
    .index("by_user_id", ["userId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"]),

  invoices: defineTable({
    orgId: v.string(),
    subscriptionId: v.optional(v.id("subscriptions")),
    stripeInvoiceId: v.string(),
    stripeInvoiceNumber: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("paid"),
      v.literal("void"),
      v.literal("uncollectible")
    ),
    amountDue: v.number(), // USD cents
    amountPaid: v.number(),
    amountRemaining: v.number(),
    currency: v.string(),
    dueDate: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    hostedInvoiceUrl: v.optional(v.string()),
    invoicePdf: v.optional(v.string()),
    periodStart: v.number(),
    periodEnd: v.number(),
    lines: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
      quantity: v.number(),
      periodStart: v.number(),
      periodEnd: v.number(),
    }))),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_stripe_invoice_id", ["stripeInvoiceId"])
    .index("by_status", ["status"])
    .index("by_org_date", ["orgId", "createdAt"]),

  usage_metering: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    metric: v.string(), // "conversations", "ai_messages", "tokens", "api_calls", "kb_documents", "seats"
    usage: v.number(),
    limit: v.optional(v.number()),
    resetAt: v.number(), // when this metric resets
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_org_metric_date", ["orgId", "metric", "date"]),

  seats: defineTable({
    orgId: v.string(),
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("agent"), v.literal("viewer")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("disabled")),
    invitedAt: v.number(),
    joinedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    metadata: v.optional(v.object({})),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_org_role", ["orgId", "role"])
    .index("by_org_status", ["orgId", "status"]),

  coupons: defineTable({
    orgId: v.optional(v.string()),
    code: v.string(),
    name: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed_amount")),
    amountOff: v.optional(v.number()), // USD cents if fixed
    percentOff: v.optional(v.number()), // 0-100 if percentage
    currency: v.optional(v.string()),
    duration: v.union(v.literal("once"), v.literal("repeating"), v.literal("forever")),
    durationInMonths: v.optional(v.number()), // for repeating
    maxRedemptions: v.optional(v.number()),
    timesRedeemed: v.number(),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    appliesToPlans: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    stripeCouponId: v.optional(v.string()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_org_id", ["orgId"])
    .index("by_active", ["isActive"]),

  feature_flags: defineTable({
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
    featureKey: v.string(),
    value: v.union(v.boolean(), v.string(), v.number()),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_feature", ["orgId", "featureKey"])
    .index("by_user_feature", ["userId", "featureKey"])
    .index("by_feature", ["featureKey"]),

  stripe_events: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    data: v.any(),
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_stripe_event_id", ["stripeEventId"])
    .index("by_type", ["type"])
    .index("by_processed", ["processed"]),
});
