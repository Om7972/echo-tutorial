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
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt"), v.literal("md")),
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("failed")
    ),
    version: v.number(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    summary: v.optional(v.string()),
    progress: v.optional(v.number()), // 0-100
    errorMessage: v.optional(v.string()),
    parentDocumentId: v.optional(v.id("documents")), // for versioning
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
    tokenCount: v.optional(v.number()),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
  })
    .index("by_document_id", ["documentId"])
    .index("by_org_id", ["orgId"]),

  embeddings: defineTable({
    orgId: v.string(),
    chunkId: v.id("chunks"),
    documentId: v.id("documents"),
    embedding: v.array(v.float64()),
    model: v.string(), // e.g. "text-embedding-3-small"
    createdAt: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["orgId"],
    })
    .index("by_chunk_id", ["chunkId"])
    .index("by_document_id", ["documentId"]),

  citations: defineTable({
    orgId: v.string(),
    chunkId: v.id("chunks"),
    documentId: v.id("documents"),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    query: v.string(),
    score: v.number(),
    citedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_document_id", ["documentId"])
    .index("by_chunk_id", ["chunkId"]),

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

  // ─── Comprehensive Audit System ────────────────────────────────────────────
  audit_logs: defineTable({
    orgId: v.string(),
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    action: v.union(
      v.literal("login"),
      v.literal("logout"),
      v.literal("message_edit"),
      v.literal("message_delete"),
      v.literal("conversation_create"),
      v.literal("conversation_delete"),
      v.literal("role_change"),
      v.literal("billing_update"),
      v.literal("api_key_create"),
      v.literal("api_key_revoke"),
      v.literal("api_key_rotate"),
      v.literal("settings_update"),
      v.literal("export_data"),
      v.literal("webhook_create"),
      v.literal("webhook_update"),
      v.literal("webhook_delete"),
      v.literal("user_invite"),
      v.literal("user_remove"),
      v.literal("permission_change")
    ),
    resource: v.optional(v.string()), // Resource type (conversation, message, user, etc.)
    resourceId: v.optional(v.string()), // ID of the affected resource
    details: v.any(), // Flexible JSON details
    changes: v.optional(v.object({
      before: v.any(),
      after: v.any(),
    })),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    location: v.optional(v.object({
      country: v.optional(v.string()),
      city: v.optional(v.string()),
    })),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_timestamp", ["orgId", "timestamp"])
    .index("by_user_id", ["userId"])
    .index("by_action", ["action"])
    .index("by_resource", ["resource", "resourceId"])
    .index("by_org_action", ["orgId", "action"]),

  // ─── Webhook System ─────────────────────────────────────────────────────────
  webhooks: defineTable({
    orgId: v.string(),
    name: v.string(),
    url: v.string(),
    secret: v.string(), // For signature verification
    events: v.array(v.union(
      v.literal("conversation.created"),
      v.literal("conversation.updated"),
      v.literal("conversation.closed"),
      v.literal("message.received"),
      v.literal("message.sent"),
      v.literal("ticket.created"),
      v.literal("ticket.closed"),
      v.literal("handoff.started"),
      v.literal("handoff.completed"),
      v.literal("payment.success"),
      v.literal("payment.failed"),
      v.literal("subscription.created"),
      v.literal("subscription.updated"),
      v.literal("subscription.cancelled"),
      v.literal("*") // All events
    )),
    isActive: v.boolean(),
    headers: v.optional(v.array(v.object({
      key: v.string(),
      value: v.string(),
    }))),
    retryPolicy: v.object({
      maxRetries: v.number(),
      retryDelay: v.number(), // milliseconds
      exponentialBackoff: v.boolean(),
    }),
    timeout: v.number(), // milliseconds
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTriggeredAt: v.optional(v.number()),
    totalDeliveries: v.number(),
    successfulDeliveries: v.number(),
    failedDeliveries: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"]),

  webhook_deliveries: defineTable({
    webhookId: v.id("webhooks"),
    orgId: v.string(),
    event: v.string(),
    payload: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    attempts: v.number(),
    maxAttempts: v.number(),
    response: v.optional(v.object({
      statusCode: v.number(),
      headers: v.optional(v.any()),
      body: v.optional(v.string()),
      duration: v.number(), // milliseconds
    })),
    error: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    triggeredAt: v.number(),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_webhook_id", ["webhookId"])
    .index("by_org_id", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_event", ["orgId", "event"])
    .index("by_triggered_at", ["triggeredAt"]),

  webhook_logs: defineTable({
    webhookId: v.id("webhooks"),
    deliveryId: v.id("webhook_deliveries"),
    orgId: v.string(),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_webhook_id", ["webhookId"])
    .index("by_delivery_id", ["deliveryId"])
    .index("by_org_id", ["orgId"])
    .index("by_level", ["level"]),

  // ─── AI Evaluation System ───────────────────────────────────────────────────
  ai_evaluations: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    responseType: v.union(v.literal("ai"), v.literal("human")),
    
    // Evaluation metrics
    hallucinationScore: v.number(), // 0-1, lower is better
    confidenceScore: v.number(), // 0-1
    relevanceScore: v.number(), // 0-1
    accuracyScore: v.number(), // 0-1
    qualityScore: v.number(), // 0-1, overall
    
    // Content analysis
    query: v.string(),
    response: v.string(),
    expectedResponse: v.optional(v.string()),
    sourcesUsed: v.optional(v.array(v.string())),
    
    // Flags
    hasHallucination: v.boolean(),
    needsReview: v.boolean(),
    isApproved: v.optional(v.boolean()),
    
    // Evaluation metadata
    evaluatedBy: v.union(v.literal("ai"), v.literal("human")),
    evaluatorModel: v.optional(v.string()),
    evaluationMethod: v.string(),
    
    // Customer feedback
    customerRating: v.optional(v.number()),
    customerFeedback: v.optional(v.string()),
    
    // Cost tracking
    tokensUsed: v.number(),
    costUSD: v.number(),
    
    // Timestamps
    evaluatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_needs_review", ["needsReview"])
    .index("by_has_hallucination", ["hasHallucination"])
    .index("by_org_date", ["orgId", "evaluatedAt"])
    .index("by_quality_score", ["qualityScore"]),

  evaluation_reports: defineTable({
    orgId: v.string(),
    reportType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("custom")
    ),
    dateFrom: v.string(),
    dateTo: v.string(),
    
    // Aggregate metrics
    totalEvaluations: v.number(),
    avgHallucinationScore: v.number(),
    avgConfidenceScore: v.number(),
    avgRelevanceScore: v.number(),
    avgAccuracyScore: v.number(),
    avgQualityScore: v.number(),
    
    // Issue tracking
    hallucinationsDetected: v.number(),
    responsesNeedingReview: v.number(),
    lowConfidenceResponses: v.number(),
    
    // Customer satisfaction
    avgCustomerRating: v.optional(v.number()),
    totalCustomerRatings: v.number(),
    
    // Improvement metrics
    improvementRate: v.optional(v.number()),
    topIssues: v.array(v.object({
      issue: v.string(),
      count: v.number(),
      severity: v.string(),
    })),
    
    // Recommendations
    recommendations: v.array(v.string()),
    
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_date", ["orgId", "dateFrom"])
    .index("by_report_type", ["reportType"]),

  // ─── Security Framework ─────────────────────────────────────────────────────
  rate_limits: defineTable({
    identifier: v.string(), // IP, userId, apiKey
    identifierType: v.union(
      v.literal("ip"),
      v.literal("user"),
      v.literal("api_key")
    ),
    endpoint: v.string(),
    requests: v.number(),
    windowStart: v.number(),
    windowDuration: v.number(), // in milliseconds
    isBlocked: v.boolean(),
    blockedUntil: v.optional(v.number()),
  })
    .index("by_identifier", ["identifier"])
    .index("by_identifier_endpoint", ["identifier", "endpoint"])
    .index("by_blocked", ["isBlocked"]),

  security_events: defineTable({
    orgId: v.optional(v.string()),
    eventType: v.union(
      v.literal("bot_detected"),
      v.literal("rate_limit_exceeded"),
      v.literal("suspicious_ip"),
      v.literal("csrf_attempt"),
      v.literal("xss_attempt"),
      v.literal("sql_injection_attempt"),
      v.literal("brute_force_attempt"),
      v.literal("unauthorized_access"),
      v.literal("invalid_session")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    userId: v.optional(v.string()),
    endpoint: v.string(),
    requestData: v.optional(v.any()),
    isBlocked: v.boolean(),
    blockDuration: v.optional(v.number()),
    detectionMethod: v.string(),
    details: v.any(),
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_ip", ["ipAddress"])
    .index("by_severity", ["severity"])
    .index("by_event_type", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  ip_restrictions: defineTable({
    orgId: v.string(),
    ipAddress: v.string(),
    type: v.union(v.literal("whitelist"), v.literal("blacklist")),
    reason: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_ip", ["ipAddress"])
    .index("by_type", ["type"]),

  device_tracking: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    deviceFingerprint: v.string(),
    userAgent: v.string(),
    browser: v.string(),
    os: v.string(),
    deviceType: v.union(v.literal("desktop"), v.literal("mobile"), v.literal("tablet")),
    ipAddress: v.string(),
    location: v.optional(v.object({
      country: v.optional(v.string()),
      city: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })),
    isTrusted: v.boolean(),
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_device_id", ["deviceId"])
    .index("by_fingerprint", ["deviceFingerprint"]),

  sessions: defineTable({
    userId: v.string(),
    sessionToken: v.string(),
    deviceId: v.string(),
    ipAddress: v.string(),
    userAgent: v.string(),
    expiresAt: v.number(),
    isActive: v.boolean(),
    lastActivityAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_session_token", ["sessionToken"])
    .index("by_device_id", ["deviceId"])
    .index("by_expires_at", ["expiresAt"]),

  encrypted_secrets: defineTable({
    orgId: v.string(),
    key: v.string(),
    encryptedValue: v.string(),
    algorithm: v.string(),
    keyVersion: v.number(),
    lastRotated: v.number(),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_org_key", ["orgId", "key"])
    .index("by_expires_at", ["expiresAt"]),

  // ─── Worker Queues ──────────────────────────────────────────────────────────
  job_queue: defineTable({
    orgId: v.string(),
    jobType: v.union(
      v.literal("email"),
      v.literal("embeddings"),
      v.literal("summaries"),
      v.literal("webhooks"),
      v.literal("notifications"),
      v.literal("analytics"),
      v.literal("cleanup")
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("dead")
    ),
    payload: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    attempts: v.number(),
    maxAttempts: v.number(),
    nextRetryAt: v.optional(v.number()),
    processedBy: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_org_id", ["orgId"])
    .index("by_job_type", ["jobType"])
    .index("by_priority_status", ["priority", "status"])
    .index("by_scheduled_for", ["scheduledFor"]),

  dead_letter_queue: defineTable({
    orgId: v.string(),
    originalJobId: v.id("job_queue"),
    jobType: v.string(),
    payload: v.any(),
    error: v.string(),
    attempts: v.number(),
    failedAt: v.number(),
    canRetry: v.boolean(),
    retried: v.boolean(),
    retriedAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_failed_at", ["failedAt"])
    .index("by_can_retry", ["canRetry"]),

  cron_jobs: defineTable({
    name: v.string(),
    schedule: v.string(), // cron expression
    jobType: v.string(),
    payload: v.optional(v.any()),
    isActive: v.boolean(),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.number(),
    lastStatus: v.optional(v.union(v.literal("success"), v.literal("failed"))),
    lastError: v.optional(v.string()),
    runCount: v.number(),
    avgDuration: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_next_run", ["nextRunAt"])
    .index("by_active", ["isActive"]),

  health_checks: defineTable({
    service: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    responseTime: v.number(),
    lastCheckedAt: v.number(),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_service", ["service"])
    .index("by_status", ["status"]),

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

  // ─── Long-Term AI Memory System ───────────────────────────────────────────
  conversation_memories: defineTable({
    conversationId: v.id("conversations"),
    orgId: v.string(),
    userId: v.optional(v.string()), // authenticated user or null for visitors
    visitorId: v.optional(v.string()), // for anonymous visitors
    
    // Memory metadata
    type: v.union(
      v.literal("short_term"),  // last N messages
      v.literal("long_term"),   // summarized older conversations
      v.literal("semantic")     // embeddings-based memory
    ),
    
    // Content
    content: v.string(), // raw text or summary
    tokenCount: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastAccessedAt: v.number(),
    expiresAt: v.optional(v.number()), // for automatic expiration
    
    // Usage tracking
    accessCount: v.number(),
    relevanceScore: v.optional(v.number()), // 0-1, decays over time
    
    // References
    messageIds: v.optional(v.array(v.id("messages"))), // source messages
    summaryOf: v.optional(v.id("conversation_memories")), // if this is a summary of another memory
    
    // Metadata
    metadata: v.optional(v.object({
      sentiment: v.optional(v.string()), // "positive", "neutral", "negative"
      topics: v.optional(v.array(v.string())),
      entities: v.optional(v.array(v.string())),
      language: v.optional(v.string()),
    })),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_user_id", ["userId"])
    .index("by_visitor_id", ["visitorId"])
    .index("by_type", ["type"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_org_type", ["orgId", "type"])
    .index("by_conversation_type", ["conversationId", "type"])
    .index("by_last_accessed", ["lastAccessedAt"]),

  memory_chunks: defineTable({
    memoryId: v.id("conversation_memories"),
    conversationId: v.id("conversations"),
    orgId: v.string(),
    
    // Chunk content
    text: v.string(),
    index: v.number(), // position in sequence
    tokenCount: v.number(),
    
    // Context window
    previousChunkId: v.optional(v.id("memory_chunks")),
    nextChunkId: v.optional(v.id("memory_chunks")),
    
    // Timestamps
    createdAt: v.number(),
    
    // Metadata
    metadata: v.optional(v.object({})),
  })
    .index("by_memory_id", ["memoryId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_memory_index", ["memoryId", "index"]),

  memory_embeddings: defineTable({
    memoryId: v.id("conversation_memories"),
    chunkId: v.optional(v.id("memory_chunks")),
    conversationId: v.id("conversations"),
    orgId: v.string(),
    
    // Embedding data
    embedding: v.array(v.float64()),
    model: v.string(), // "text-embedding-3-small", "text-embedding-3-large"
    dimensions: v.number(),
    
    // Source content (for context)
    sourceText: v.string(),
    
    // Timestamps
    createdAt: v.number(),
    
    // Usage tracking
    lastUsedAt: v.optional(v.number()),
    useCount: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["orgId", "conversationId"],
    })
    .index("by_memory_id", ["memoryId"])
    .index("by_chunk_id", ["chunkId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"]),

  memory_summaries: defineTable({
    conversationId: v.id("conversations"),
    orgId: v.string(),
    
    // Summary content
    summary: v.string(),
    summaryType: v.union(
      v.literal("rolling"),     // continuous summary of conversation
      v.literal("periodic"),    // summary of time period
      v.literal("thematic"),    // summary of specific topic
      v.literal("final")        // final summary when conversation closes
    ),
    
    // Source information
    sourceMemoryIds: v.array(v.id("conversation_memories")),
    messageCount: v.number(),
    timeRangeStart: v.number(),
    timeRangeEnd: v.number(),
    
    // Content analysis
    keyPoints: v.array(v.string()),
    actionItems: v.optional(v.array(v.string())),
    decisions: v.optional(v.array(v.string())),
    
    // Customer insights
    customerProfile: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      company: v.optional(v.string()),
      preferences: v.optional(v.array(v.string())),
      painPoints: v.optional(v.array(v.string())),
      goals: v.optional(v.array(v.string())),
    })),
    
    // Purchase/Product context
    purchaseHistory: v.optional(v.array(v.object({
      product: v.string(),
      date: v.optional(v.number()),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
    }))),
    
    // Issues tracking
    issuesEncountered: v.optional(v.array(v.object({
      issue: v.string(),
      severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      status: v.union(v.literal("open"), v.literal("resolved"), v.literal("escalated")),
      timestamp: v.number(),
    }))),
    
    // Sentiment analysis
    overallSentiment: v.optional(v.string()), // "positive", "neutral", "negative", "mixed"
    sentimentScore: v.optional(v.number()), // -1 to 1
    sentimentTrend: v.optional(v.array(v.object({
      timestamp: v.number(),
      score: v.number(),
    }))),
    
    // AI generation metadata
    generatedBy: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Version control
    version: v.number(),
    previousVersionId: v.optional(v.id("memory_summaries")),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_summary_type", ["summaryType"])
    .index("by_org_conversation", ["orgId", "conversationId"])
    .index("by_time_range", ["timeRangeStart", "timeRangeEnd"]),

  memory_retrieval_logs: defineTable({
    conversationId: v.id("conversations"),
    orgId: v.string(),
    
    // Query information
    query: v.string(),
    queryEmbedding: v.optional(v.array(v.float64())),
    
    // Retrieval strategy
    strategy: v.union(
      v.literal("recency"),     // most recent memories
      v.literal("semantic"),    // vector similarity
      v.literal("hybrid"),      // combined approach
      v.literal("context_ranked") // ranked by relevance
    ),
    
    // Results
    memoriesRetrieved: v.array(v.id("conversation_memories")),
    relevanceScores: v.array(v.number()),
    
    // Performance metrics
    retrievalTimeMs: v.number(),
    tokensRetrieved: v.number(),
    
    // Timestamps
    timestamp: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_strategy", ["strategy"]),

  memory_jobs: defineTable({
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    
    // Job configuration
    jobType: v.union(
      v.literal("summarize"),
      v.literal("generate_embeddings"),
      v.literal("expire_memories"),
      v.literal("consolidate"),
      v.literal("analyze_sentiment")
    ),
    
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Progress tracking
    progress: v.number(), // 0-100
    totalItems: v.optional(v.number()),
    processedItems: v.optional(v.number()),
    
    // Results
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    
    // Resource usage
    tokensUsed: v.optional(v.number()),
    costUSD: v.optional(v.number()),
    
    // Timestamps
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    // Retry logic
    retryCount: v.number(),
    maxRetries: v.number(),
    
    // Priority
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_job_type", ["jobType"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_scheduled_at", ["scheduledAt"])
    .index("by_priority_scheduled", ["priority", "scheduledAt"]),

  memory_analytics: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    
    // Usage statistics
    totalMemories: v.number(),
    shortTermMemories: v.number(),
    longTermMemories: v.number(),
    semanticMemories: v.number(),
    
    // Storage metrics
    totalTokens: v.number(),
    totalEmbeddings: v.number(),
    
    // Processing metrics
    summarizationsCompleted: v.number(),
    embeddingsGenerated: v.number(),
    memoriesExpired: v.number(),
    
    // Cost tracking
    totalCostUSD: v.number(),
    summarizationCostUSD: v.number(),
    embeddingCostUSD: v.number(),
    
    // Performance metrics
    avgRetrievalTimeMs: v.number(),
    totalRetrievals: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_date", ["date"]),

  // ─── AI Sentiment & Intent Analysis ────────────────────────────────────────
  sentiment_analysis: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    
    // Sentiment detection
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("neutral"),
      v.literal("angry"),
      v.literal("urgent"),
      v.literal("confused"),
      v.literal("frustrated"),
      v.literal("satisfied")
    ),
    sentimentScore: v.number(), // -1 to 1
    sentimentConfidence: v.number(), // 0 to 1
    
    // Intent classification
    intent: v.union(
      v.literal("refund"),
      v.literal("pricing"),
      v.literal("technical_issue"),
      v.literal("feature_request"),
      v.literal("complaint"),
      v.literal("general_inquiry"),
      v.literal("feedback"),
      v.literal("cancel_subscription"),
      v.literal("billing_issue"),
      v.literal("account_issue")
    ),
    intentScore: v.number(), // 0 to 1 (confidence)
    intentConfidence: v.number(), // 0 to 1
    secondaryIntents: v.optional(v.array(v.object({
      intent: v.string(),
      score: v.number(),
    }))),
    
    // Message content
    messageContent: v.string(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    
    // Analysis metadata
    analyzedBy: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
    
    // Auto-trigger tracking
    triggeredHandoff: v.boolean(),
    triggeredPriorityIncrease: v.boolean(),
    triggeredVIPRouting: v.boolean(),
    triggerReason: v.optional(v.string()),
    
    // Timestamps
    analyzedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_message_id", ["messageId"])
    .index("by_sentiment", ["sentiment"])
    .index("by_intent", ["intent"])
    .index("by_org_sentiment", ["orgId", "sentiment"])
    .index("by_org_intent", ["orgId", "intent"])
    .index("by_org_date", ["orgId", "analyzedAt"])
    .index("by_conversation_date", ["conversationId", "analyzedAt"]),

  sentiment_triggers: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    sentimentAnalysisId: v.id("sentiment_analysis"),
    
    // Trigger type
    triggerType: v.union(
      v.literal("human_handoff"),
      v.literal("priority_increase"),
      v.literal("vip_routing"),
      v.literal("escalation"),
      v.literal("supervisor_alert")
    ),
    
    // Trigger reason
    reason: v.string(),
    conditions: v.array(v.object({
      type: v.string(),
      value: v.any(),
      threshold: v.optional(v.number()),
    })),
    
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("executed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Execution
    executedAt: v.optional(v.number()),
    executedBy: v.optional(v.string()),
    executionResult: v.optional(v.any()),
    error: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_sentiment_analysis_id", ["sentimentAnalysisId"])
    .index("by_trigger_type", ["triggerType"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"]),

  sentiment_trends: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    hour: v.optional(v.number()), // 0-23 for hourly trends
    
    // Sentiment counts
    positiveCount: v.number(),
    negativeCount: v.number(),
    neutralCount: v.number(),
    angryCount: v.number(),
    urgentCount: v.number(),
    confusedCount: v.number(),
    frustratedCount: v.number(),
    satisfiedCount: v.number(),
    
    // Average scores
    avgSentimentScore: v.number(), // -1 to 1
    avgConfidence: v.number(), // 0 to 1
    
    // Intent counts
    refundCount: v.number(),
    pricingCount: v.number(),
    technicalIssueCount: v.number(),
    featureRequestCount: v.number(),
    complaintCount: v.number(),
    generalInquiryCount: v.number(),
    
    // Trigger counts
    handoffTriggered: v.number(),
    priorityIncreased: v.number(),
    vipRouted: v.number(),
    
    // Totals
    totalAnalyses: v.number(),
    totalConversations: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_org_date_hour", ["orgId", "date", "hour"])
    .index("by_date", ["date"]),

  sentiment_rules: defineTable({
    orgId: v.string(),
    
    // Rule configuration
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(), // Higher = executed first
    
    // Conditions
    conditions: v.object({
      sentiments: v.optional(v.array(v.string())),
      intents: v.optional(v.array(v.string())),
      minSentimentScore: v.optional(v.number()),
      maxSentimentScore: v.optional(v.number()),
      minConfidence: v.optional(v.number()),
      consecutiveNegative: v.optional(v.number()), // Count of consecutive negative messages
      customerTier: v.optional(v.array(v.string())), // "vip", "premium", "standard"
    }),
    
    // Actions
    actions: v.object({
      triggerHandoff: v.boolean(),
      increasePriority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
      routeToVIP: v.boolean(),
      notifyTeam: v.optional(v.array(v.string())), // User IDs
      addTags: v.optional(v.array(v.string())),
      assignTo: v.optional(v.string()), // User ID
    }),
    
    // Metadata
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    executionCount: v.number(),
    lastExecutedAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"])
    .index("by_priority", ["priority"]),

  sentiment_analytics: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    
    // Overall metrics
    totalMessages: v.number(),
    analyzedMessages: v.number(),
    analysisRate: v.number(), // percentage
    
    // Sentiment distribution
    sentimentDistribution: v.object({
      positive: v.number(),
      negative: v.number(),
      neutral: v.number(),
      angry: v.number(),
      urgent: v.number(),
      confused: v.number(),
      frustrated: v.number(),
      satisfied: v.number(),
    }),
    
    // Intent distribution
    intentDistribution: v.object({
      refund: v.number(),
      pricing: v.number(),
      technical_issue: v.number(),
      feature_request: v.number(),
      complaint: v.number(),
      general_inquiry: v.number(),
      other: v.number(),
    }),
    
    // Performance metrics
    avgAnalysisTimeMs: v.number(),
    avgConfidence: v.number(),
    
    // Trigger metrics
    totalTriggers: v.number(),
    handoffRate: v.number(), // percentage
    priorityIncreaseRate: v.number(),
    vipRoutingRate: v.number(),
    
    // Cost tracking
    totalCostUSD: v.number(),
    avgCostPerAnalysis: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_date", ["date"]),

  // ─── Unified Inbox System ──────────────────────────────────────────────────
  channels: defineTable({
    orgId: v.string(),
    
    // Channel configuration
    type: v.union(
      v.literal("website_widget"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("instagram"),
      v.literal("facebook_messenger"),
      v.literal("sms"),
      v.literal("slack"),
      v.literal("discord")
    ),
    name: v.string(),
    description: v.optional(v.string()),
    
    // Status
    isActive: v.boolean(),
    isConnected: v.boolean(),
    
    // Configuration
    config: v.object({
      // Email
      imapHost: v.optional(v.string()),
      imapPort: v.optional(v.number()),
      smtpHost: v.optional(v.string()),
      smtpPort: v.optional(v.number()),
      email: v.optional(v.string()),
      
      // WhatsApp
      phoneNumber: v.optional(v.string()),
      businessAccountId: v.optional(v.string()),
      
      // Telegram
      botToken: v.optional(v.string()),
      
      // Instagram/Facebook
      pageId: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      
      // Widget
      widgetId: v.optional(v.string()),
      allowedDomains: v.optional(v.array(v.string())),
    }),
    
    // Settings
    settings: v.object({
      autoReply: v.boolean(),
      autoReplyMessage: v.optional(v.string()),
      businessHours: v.optional(v.object({
        enabled: v.boolean(),
        timezone: v.string(),
        schedule: v.array(v.object({
          day: v.number(), // 0-6
          start: v.string(), // HH:mm
          end: v.string(), // HH:mm
        })),
      })),
      routing: v.optional(v.object({
        method: v.union(v.literal("round_robin"), v.literal("least_active"), v.literal("manual")),
        assignToTeam: v.optional(v.string()),
      })),
    }),
    
    // Statistics
    totalConversations: v.number(),
    totalMessages: v.number(),
    lastMessageAt: v.optional(v.number()),
    
    // Timestamps
    connectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_type", ["orgId", "type"])
    .index("by_org_active", ["orgId", "isActive"]),

  unified_conversations: defineTable({
    orgId: v.string(),
    
    // Channel information
    channelId: v.id("channels"),
    channelType: v.string(),
    externalId: v.optional(v.string()), // ID from external platform
    
    // Customer information
    customerId: v.id("unified_customers"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAvatar: v.optional(v.string()),
    
    // Conversation status
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    
    // Assignment
    assignedTo: v.optional(v.string()), // User ID
    assignedAt: v.optional(v.number()),
    teamId: v.optional(v.string()),
    
    // Priority and categorization
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    category: v.optional(v.string()),
    tags: v.array(v.string()),
    
    // Message tracking
    lastMessageText: v.string(),
    lastMessageAt: v.number(),
    lastMessageFrom: v.union(v.literal("customer"), v.literal("agent"), v.literal("bot")),
    unreadCount: v.number(),
    totalMessages: v.number(),
    
    // AI assistance
    hasSentimentAnalysis: v.boolean(),
    latestSentiment: v.optional(v.string()),
    latestIntent: v.optional(v.string()),
    aiSuggestions: v.optional(v.array(v.string())),
    
    // SLA tracking
    firstResponseAt: v.optional(v.number()),
    firstResponseTimeMs: v.optional(v.number()),
    resolutionAt: v.optional(v.number()),
    resolutionTimeMs: v.optional(v.number()),
    slaDeadline: v.optional(v.number()),
    
    // Metadata
    metadata: v.optional(v.object({})),
    isArchived: v.boolean(),
    isPinned: v.boolean(),
    
    // Timestamps
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_channel_id", ["channelId"])
    .index("by_customer_id", ["customerId"])
    .index("by_status", ["status"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_channel", ["orgId", "channelId"])
    .index("by_org_updated", ["orgId", "updatedAt"])
    .index("by_org_priority", ["orgId", "priority"])
    .index("by_org_unread", ["orgId", "unreadCount"])
    .index("by_external_id", ["externalId"]),

  unified_messages: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    channelId: v.id("channels"),
    customerId: v.id("unified_customers"),
    
    // Message content
    content: v.string(),
    contentType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file"),
      v.literal("location"),
      v.literal("contact")
    ),
    
    // Sender information
    senderType: v.union(v.literal("customer"), v.literal("agent"), v.literal("bot"), v.literal("system")),
    senderId: v.optional(v.string()), // User ID for agents
    senderName: v.string(),
    
    // Status
    status: v.union(
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed")
    ),
    
    // Attachments
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
      storageId: v.optional(v.id("_storage")),
      thumbnail: v.optional(v.string()),
    }))),
    
    // Reply context
    replyToId: v.optional(v.id("unified_messages")),
    isForwarded: v.optional(v.boolean()),
    
    // External platform
    externalId: v.optional(v.string()),
    externalMetadata: v.optional(v.object({})),
    
    // AI context
    sentimentAnalysisId: v.optional(v.id("sentiment_analysis")),
    
    // Timestamps
    sentAt: v.number(),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_channel_id", ["channelId"])
    .index("by_customer_id", ["customerId"])
    .index("by_org_id", ["orgId"])
    .index("by_conversation_sent", ["conversationId", "sentAt"])
    .index("by_external_id", ["externalId"]),

  unified_customers: defineTable({
    orgId: v.string(),
    
    // Primary identity
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    
    // Channel identities (for merging)
    channelIdentities: v.array(v.object({
      channelId: v.id("channels"),
      channelType: v.string(),
      externalId: v.string(),
      username: v.optional(v.string()),
      metadata: v.optional(v.object({})),
    })),
    
    // Customer profile
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
    
    // Segmentation
    tier: v.optional(v.union(
      v.literal("standard"),
      v.literal("premium"),
      v.literal("vip"),
      v.literal("enterprise")
    )),
    tags: v.array(v.string()),
    
    // Activity
    totalConversations: v.number(),
    totalMessages: v.number(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastChannelUsed: v.optional(v.id("channels")),
    
    // Sentiment history
    overallSentiment: v.optional(v.string()),
    avgSentimentScore: v.optional(v.number()),
    
    // Custom fields
    customFields: v.optional(v.object({})),
    notes: v.optional(v.string()),
    
    // Lifecycle
    isBlocked: v.boolean(),
    blockedReason: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_org_email", ["orgId", "email"])
    .index("by_org_phone", ["orgId", "phone"])
    .index("by_org_tier", ["orgId", "tier"]),

  conversation_assignments: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    
    // Assignment details
    assignedTo: v.string(), // User ID
    assignedBy: v.optional(v.string()), // User ID who assigned
    assignmentMethod: v.union(
      v.literal("manual"),
      v.literal("round_robin"),
      v.literal("least_active"),
      v.literal("auto_routing")
    ),
    
    // Status
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("transferred")),
    
    // Timestamps
    assignedAt: v.number(),
    completedAt: v.optional(v.number()),
    
    // Performance tracking
    firstResponseAt: v.optional(v.number()),
    avgResponseTimeMs: v.optional(v.number()),
    messagesHandled: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_org_assigned", ["orgId", "assignedTo"])
    .index("by_org_status", ["orgId", "status"]),

  conversation_transfers: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    
    // Transfer details
    fromUserId: v.optional(v.string()),
    toUserId: v.string(),
    transferredBy: v.string(),
    
    // Reason
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    
    // Status
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    
    // Timestamps
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_to_user", ["toUserId"])
    .index("by_org_to_user", ["orgId", "toUserId"]),

  typing_indicators: defineTable({
    conversationId: v.id("unified_conversations"),
    userId: v.string(),
    userName: v.string(),
    userType: v.union(v.literal("agent"), v.literal("customer")),
    isTyping: v.boolean(),
    lastUpdatedAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"]),

  inbox_filters: defineTable({
    orgId: v.string(),
    userId: v.string(),
    
    // Filter configuration
    name: v.string(),
    description: v.optional(v.string()),
    
    // Filter criteria
    channels: v.optional(v.array(v.id("channels"))),
    statuses: v.optional(v.array(v.string())),
    priorities: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.union(v.literal("me"), v.literal("unassigned"), v.literal("team"))),
    tags: v.optional(v.array(v.string())),
    hasUnread: v.optional(v.boolean()),
    
    // Sort options
    sortBy: v.union(
      v.literal("lastMessageAt"),
      v.literal("createdAt"),
      v.literal("priority"),
      v.literal("unreadCount")
    ),
    sortOrder: v.union(v.literal("asc"), v.literal("desc")),
    
    // Display
    isDefault: v.boolean(),
    isPinned: v.boolean(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  conversation_search_index: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    
    // Searchable content
    searchableText: v.string(), // Aggregated text from messages
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    tags: v.array(v.string()),
    
    // Metadata for search results
    lastMessageAt: v.number(),
    channelType: v.string(),
    
    // Timestamps
    indexedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .searchIndex("search_content", {
      searchField: "searchableText",
      filterFields: ["orgId", "channelType"],
    }),

  // ─── Customer Activity Timeline ────────────────────────────────────────────
  activity_events: defineTable({
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    
    // Event classification
    eventType: v.union(
      v.literal("chat_message"),
      v.literal("call"),
      v.literal("email"),
      v.literal("note"),
      v.literal("billing_event"),
      v.literal("subscription_change"),
      v.literal("status_change"),
      v.literal("assignment_change"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("merge"),
      v.literal("profile_update"),
      v.literal("document_uploaded"),
      v.literal("payment_received"),
      v.literal("refund_issued")
    ),
    eventCategory: v.union(
      v.literal("communication"),
      v.literal("system"),
      v.literal("billing"),
      v.literal("support")
    ),
    
    // Event details
    title: v.string(),
    description: v.optional(v.string()),
    
    // Event data (flexible JSON)
    eventData: v.optional(v.object({
      // Chat message
      messageId: v.optional(v.id("unified_messages")),
      messageContent: v.optional(v.string()),
      conversationId: v.optional(v.id("unified_conversations")),
      channelType: v.optional(v.string()),
      
      // Call
      callDuration: v.optional(v.number()),
      callDirection: v.optional(v.union(v.literal("inbound"), v.literal("outbound"))),
      callStatus: v.optional(v.string()),
      recordingUrl: v.optional(v.string()),
      
      // Email
      emailSubject: v.optional(v.string()),
      emailBody: v.optional(v.string()),
      emailDirection: v.optional(v.union(v.literal("sent"), v.literal("received"))),
      
      // Note
      noteContent: v.optional(v.string()),
      noteType: v.optional(v.string()),
      
      // Billing
      amount: v.optional(v.number()),
      currency: v.optional(v.string()),
      invoiceId: v.optional(v.string()),
      transactionId: v.optional(v.string()),
      
      // Subscription
      subscriptionId: v.optional(v.string()),
      planName: v.optional(v.string()),
      previousPlan: v.optional(v.string()),
      newPlan: v.optional(v.string()),
      
      // Status/Assignment
      previousValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
      
      // Generic
      metadata: v.optional(v.object({})),
    })),
    
    // Actor (who performed the action)
    actorType: v.union(
      v.literal("customer"),
      v.literal("agent"),
      v.literal("system"),
      v.literal("api")
    ),
    actorId: v.optional(v.string()),
    actorName: v.string(),
    
    // Related entities
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.optional(v.id("unified_messages")),
    
    // Visibility
    isVisible: v.boolean(), // Show in timeline
    isInternal: v.boolean(), // Internal note/event
    
    // Rich content
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
    }))),
    
    // Timestamps
    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_customer_id", ["customerId"])
    .index("by_org_id", ["orgId"])
    .index("by_customer_occurred", ["customerId", "occurredAt"])
    .index("by_org_occurred", ["orgId", "occurredAt"])
    .index("by_event_type", ["eventType"])
    .index("by_event_category", ["eventCategory"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_type_occurred", ["orgId", "eventType", "occurredAt"]),

  activity_notes: defineTable({
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Note content
    content: v.string(),
    noteType: v.union(
      v.literal("general"),
      v.literal("internal"),
      v.literal("meeting"),
      v.literal("followup"),
      v.literal("resolution")
    ),
    
    // Author
    authorId: v.string(),
    authorName: v.string(),
    
    // Metadata
    isPinned: v.boolean(),
    isInternal: v.boolean(),
    
    // Attachments
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
    }))),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer_id", ["customerId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_customer_created", ["customerId", "createdAt"]),

  call_logs: defineTable({
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Call details
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(
      v.literal("completed"),
      v.literal("missed"),
      v.literal("voicemail"),
      v.literal("busy"),
      v.literal("failed")
    ),
    
    // Duration
    durationSeconds: v.number(),
    
    // Participants
    fromNumber: v.string(),
    toNumber: v.string(),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    
    // Recording
    recordingUrl: v.optional(v.string()),
    recordingDuration: v.optional(v.number()),
    
    // Transcription
    transcription: v.optional(v.string()),
    
    // External IDs
    externalCallId: v.optional(v.string()),
    
    // Notes
    notes: v.optional(v.string()),
    
    // Timestamps
    startedAt: v.number(),
    endedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_customer_id", ["customerId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_org_started", ["orgId", "startedAt"])
    .index("by_external_id", ["externalCallId"]),

  email_logs: defineTable({
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Email details
    direction: v.union(v.literal("sent"), v.literal("received")),
    subject: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    
    // Participants
    from: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    
    // Tracking
    opened: v.boolean(),
    openedAt: v.optional(v.number()),
    clicked: v.boolean(),
    clickedAt: v.optional(v.number()),
    
    // Attachments
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
    }))),
    
    // External IDs
    externalMessageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    
    // Timestamps
    sentAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_customer_id", ["customerId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_id", ["orgId"])
    .index("by_org_sent", ["orgId", "sentAt"])
    .index("by_thread_id", ["threadId"]),

  timeline_filters: defineTable({
    userId: v.string(),
    orgId: v.string(),
    
    // Filter configuration
    name: v.string(),
    isDefault: v.boolean(),
    
    // Filter criteria
    eventTypes: v.optional(v.array(v.string())),
    eventCategories: v.optional(v.array(v.string())),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    actorTypes: v.optional(v.array(v.string())),
    showInternal: v.boolean(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  // ─── Internal Collaboration System ─────────────────────────────────────────
  collaboration_notes: defineTable({
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    
    // Note content
    content: v.string(), // Rich text / Markdown
    contentFormat: v.union(v.literal("markdown"), v.literal("html"), v.literal("plain")),
    plainText: v.string(), // For search
    
    // Author
    authorId: v.string(),
    authorName: v.string(),
    
    // Visibility
    visibility: v.union(
      v.literal("private"), // Only author
      v.literal("team"), // All team members
      v.literal("mentioned"), // Author + mentioned users
      v.literal("assigned") // Author + assigned users
    ),
    
    // Organization
    isPinned: v.boolean(),
    tags: v.array(v.string()),
    category: v.optional(v.string()),
    
    // Mentions
    mentions: v.array(v.string()), // User IDs
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // Soft delete
    
    // Metadata
    editHistory: v.optional(v.array(v.object({
      editedAt: v.number(),
      editedBy: v.string(),
      previousContent: v.string(),
    }))),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_customer_id", ["customerId"])
    .index("by_author_id", ["authorId"])
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_org_pinned", ["orgId", "isPinned"])
    .searchIndex("search_content", {
      searchField: "plainText",
      filterFields: ["orgId", "authorId"],
    }),

  collaboration_assignments: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    
    // Assignment details
    assignedTo: v.string(), // User ID
    assignedBy: v.string(), // User ID
    assignmentType: v.union(
      v.literal("owner"), // Primary owner
      v.literal("collaborator"), // Secondary helper
      v.literal("watcher"), // Just watching
      v.literal("reviewer") // Reviews before close
    ),
    
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("completed")
    ),
    acceptedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    // Context
    note: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_assigned_by", ["assignedBy"])
    .index("by_org_assigned_to", ["orgId", "assignedTo"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"]),

  collaboration_mentions: defineTable({
    orgId: v.string(),
    noteId: v.optional(v.id("collaboration_notes")),
    messageId: v.optional(v.id("unified_messages")),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Mention details
    mentionedUserId: v.string(),
    mentionedBy: v.string(),
    mentionContext: v.string(), // Snippet of text around mention
    
    // Status
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_mentioned_user", ["mentionedUserId"])
    .index("by_org_mentioned_user", ["orgId", "mentionedUserId"])
    .index("by_note_id", ["noteId"])
    .index("by_message_id", ["messageId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_user_read", ["mentionedUserId", "isRead"]),

  collaboration_notifications: defineTable({
    orgId: v.string(),
    userId: v.string(),
    
    // Notification type
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("note_reply"),
      v.literal("status_change"),
      v.literal("due_date"),
      v.literal("escalation"),
      v.literal("approval_request")
    ),
    
    // Content
    title: v.string(),
    message: v.string(),
    
    // Related entities
    conversationId: v.optional(v.id("unified_conversations")),
    noteId: v.optional(v.id("collaboration_notes")),
    assignmentId: v.optional(v.id("collaboration_assignments")),
    mentionId: v.optional(v.id("collaboration_mentions")),
    
    // Actor
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    
    // Status
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    
    // Action
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_user_id", ["userId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_type", ["type"])
    .index("by_conversation_id", ["conversationId"]),

  collaboration_activity: defineTable({
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Activity details
    activityType: v.union(
      v.literal("note_created"),
      v.literal("note_updated"),
      v.literal("note_deleted"),
      v.literal("note_pinned"),
      v.literal("note_unpinned"),
      v.literal("user_mentioned"),
      v.literal("assignment_created"),
      v.literal("assignment_accepted"),
      v.literal("assignment_declined"),
      v.literal("assignment_completed"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("permission_changed")
    ),
    
    // Actor
    actorId: v.string(),
    actorName: v.string(),
    
    // Target
    targetType: v.optional(v.string()), // "note", "assignment", "user"
    targetId: v.optional(v.string()),
    
    // Details
    description: v.string(),
    metadata: v.optional(v.object({})),
    
    // Changes (for audit)
    changes: v.optional(v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      fields: v.optional(v.array(v.string())),
    })),
    
    // Timestamps
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_actor_id", ["actorId"])
    .index("by_org_timestamp", ["orgId", "timestamp"])
    .index("by_activity_type", ["activityType"]),

  collaboration_permissions: defineTable({
    orgId: v.string(),
    
    // Subject (who has permission)
    userId: v.optional(v.string()),
    roleId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    
    // Resource (what they have permission on)
    resourceType: v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    ),
    resourceId: v.string(),
    
    // Permission level
    permission: v.union(
      v.literal("view"),
      v.literal("comment"),
      v.literal("edit"),
      v.literal("delete"),
      v.literal("admin")
    ),
    
    // Grant details
    grantedBy: v.string(),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_user_id", ["userId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_org_resource", ["orgId", "resourceType", "resourceId"]),

  collaboration_tags: defineTable({
    orgId: v.string(),
    
    // Tag details
    name: v.string(),
    color: v.string(), // Hex color
    description: v.optional(v.string()),
    
    // Category
    category: v.optional(v.string()), // "priority", "status", "topic"
    
    // Usage
    usageCount: v.number(),
    
    // Creator
    createdBy: v.string(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_name", ["orgId", "name"])
    .index("by_category", ["category"]),

  collaboration_audit: defineTable({
    orgId: v.string(),
    
    // Audit details
    action: v.string(), // "create", "update", "delete", "view"
    resourceType: v.string(), // "note", "assignment", "permission"
    resourceId: v.string(),
    
    // Actor
    actorId: v.string(),
    actorName: v.string(),
    actorIp: v.optional(v.string()),
    actorUserAgent: v.optional(v.string()),
    
    // Details
    description: v.string(),
    changes: v.optional(v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
    })),
    
    // Context
    conversationId: v.optional(v.id("unified_conversations")),
    sessionId: v.optional(v.string()),
    
    // Result
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    
    // Timestamps
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_actor_id", ["actorId"])
    .index("by_org_timestamp", ["orgId", "timestamp"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_action", ["action"]),

  // ─── Automatic Summarization ───────────────────────────────────────────────
  conversation_summaries: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    customerId: v.optional(v.id("unified_customers")),
    
    // Summary types
    shortSummary: v.string(), // 1-2 sentences
    detailedSummary: v.string(), // Comprehensive summary
    
    // Analysis
    rootCause: v.optional(v.string()),
    resolutionSteps: v.optional(v.array(v.string())),
    sentiment: v.optional(v.string()), // "positive", "negative", "neutral"
    sentimentScore: v.optional(v.number()), // -1 to 1
    
    // Action items and tags
    actionItems: v.array(v.object({
      description: v.string(),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      assignedTo: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      completed: v.boolean(),
    })),
    tags: v.array(v.string()),
    categories: v.optional(v.array(v.string())),
    
    // Generation metadata
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
    
    // Status
    status: v.union(
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("outdated")
    ),
    errorMessage: v.optional(v.string()),
    
    // Versioning
    version: v.number(),
    previousVersionId: v.optional(v.id("conversation_summaries")),
    
    // Statistics
    messageCount: v.number(),
    timeRangeStart: v.number(),
    timeRangeEnd: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    generatedBy: v.optional(v.string()), // User ID or "system"
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_conversation", ["orgId", "conversationId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_version", ["conversationId", "version"]),

  summary_generation_jobs: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    
    // Job configuration
    summaryType: v.union(
      v.literal("manual"),
      v.literal("auto"),
      v.literal("scheduled")
    ),
    trigger: v.optional(v.string()), // "conversation_closed", "message_count", "time_based"
    
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()), // 0-100
    
    // Result
    summaryId: v.optional(v.id("conversation_summaries")),
    errorMessage: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    // Resource tracking
    tokensUsed: v.optional(v.number()),
    costUSD: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"]),

  // ─── Email Support ─────────────────────────────────────────────────────────
  email_accounts: defineTable({
    orgId: v.string(),
    
    // Account details
    email: v.string(),
    displayName: v.string(),
    provider: v.union(
      v.literal("gmail"),
      v.literal("outlook"),
      v.literal("imap"),
      v.literal("custom")
    ),
    
    // IMAP configuration
    imapHost: v.optional(v.string()),
    imapPort: v.optional(v.number()),
    imapUsername: v.optional(v.string()),
    imapPassword: v.optional(v.string()), // Encrypted
    imapUseSsl: v.optional(v.boolean()),
    
    // SMTP configuration
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpUsername: v.optional(v.string()),
    smtpPassword: v.optional(v.string()), // Encrypted
    smtpUseSsl: v.optional(v.boolean()),
    
    // Settings
    signature: v.optional(v.string()),
    autoCloseAfterDays: v.optional(v.number()),
    enableSpamFilter: v.boolean(),
    enableTrackingPixels: v.boolean(),
    
    // Status
    status: v.union(
      v.literal("active"),
      v.literal("disabled"),
      v.literal("error")
    ),
    lastSyncAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email", ["email"])
    .index("by_org_status", ["orgId", "status"]),

  email_messages: defineTable({
    orgId: v.string(),
    emailAccountId: v.id("email_accounts"),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Email identifiers
    messageId: v.string(), // RFC 2822 Message-ID
    threadId: v.optional(v.string()),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    
    // Sender/Recipients
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    to: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    cc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    bcc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    
    // Content
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    
    // Attachments
    attachments: v.optional(v.array(v.object({
      filename: v.string(),
      contentType: v.string(),
      size: v.number(),
      storageId: v.optional(v.id("_storage")),
      url: v.optional(v.string()),
    }))),
    
    // Direction and status
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(
      v.literal("received"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("bounced"),
      v.literal("spam")
    ),
    
    // Tracking
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isSpam: v.boolean(),
    spamScore: v.optional(v.number()),
    
    // Delivery tracking
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    bouncedAt: v.optional(v.number()),
    
    // Tracking pixel
    trackingPixelId: v.optional(v.string()),
    openCount: v.optional(v.number()),
    clickCount: v.optional(v.number()),
    
    // Metadata
    headers: v.optional(v.any()),
    labels: v.optional(v.array(v.string())),
    errorMessage: v.optional(v.string()),
    
    // Timestamps
    receivedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email_account", ["emailAccountId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_message_id", ["messageId"])
    .index("by_thread_id", ["threadId"])
    .index("by_org_direction", ["orgId", "direction"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_received_at", ["receivedAt"]),

  email_templates: defineTable({
    orgId: v.string(),
    
    // Template details
    name: v.string(),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    
    // Categorization
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    
    // Usage
    usageCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    
    // Variables
    variables: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      defaultValue: v.optional(v.string()),
    }))),
    
    // Metadata
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_category", ["category"])
    .index("by_usage", ["usageCount"]),

  email_delivery_logs: defineTable({
    orgId: v.string(),
    emailMessageId: v.id("email_messages"),
    
    // Event details
    event: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("failed")
    ),
    
    // Event data
    recipientEmail: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    location: v.optional(v.object({
      country: v.optional(v.string()),
      city: v.optional(v.string()),
    })),
    
    // Link tracking
    linkUrl: v.optional(v.string()),
    
    // Error details
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    bounceType: v.optional(v.union(
      v.literal("hard"),
      v.literal("soft"),
      v.literal("complaint")
    )),
    
    // Metadata
    metadata: v.optional(v.any()),
    
    // Timestamp
    timestamp: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email_message", ["emailMessageId"])
    .index("by_event", ["event"])
    .index("by_org_timestamp", ["orgId", "timestamp"]),

  email_threads: defineTable({
    orgId: v.string(),
    threadId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    
    // Thread details
    subject: v.string(),
    participants: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    
    // Statistics
    messageCount: v.number(),
    lastMessageAt: v.number(),
    
    // Status
    isRead: v.boolean(),
    isStarred: v.boolean(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_thread_id", ["threadId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_org_updated", ["orgId", "updatedAt"]),

  // ─── No-Code Automation Engine ─────────────────────────────────────────────
  automation_workflows: defineTable({
    orgId: v.string(),
    
    // Workflow details
    name: v.string(),
    description: v.optional(v.string()),
    
    // Status
    isActive: v.boolean(),
    
    // Visual flow data
    flowData: v.optional(v.any()), // React Flow JSON
    
    // Execution settings
    priority: v.number(), // Higher = executed first
    retryOnFailure: v.boolean(),
    maxRetries: v.number(),
    
    // Statistics
    totalExecutions: v.number(),
    successfulExecutions: v.number(),
    failedExecutions: v.number(),
    lastExecutedAt: v.optional(v.number()),
    
    // Metadata
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"])
    .index("by_priority", ["priority"]),

  automation_triggers: defineTable({
    orgId: v.string(),
    workflowId: v.id("automation_workflows"),
    
    // Trigger configuration
    triggerType: v.union(
      v.literal("message_received"),
      v.literal("sentiment_negative"),
      v.literal("new_customer"),
      v.literal("vip_customer"),
      v.literal("conversation_idle"),
      v.literal("conversation_resolved"),
      v.literal("keyword_detected"),
      v.literal("time_based"),
      v.literal("manual")
    ),
    
    // Trigger configuration
    config: v.object({
      // Message received
      channelTypes: v.optional(v.array(v.string())),
      messageTypes: v.optional(v.array(v.string())),
      
      // Sentiment
      sentimentTypes: v.optional(v.array(v.string())),
      minSentimentScore: v.optional(v.number()),
      
      // Customer
      customerTiers: v.optional(v.array(v.string())),
      customerTags: v.optional(v.array(v.string())),
      
      // Keywords
      keywords: v.optional(v.array(v.string())),
      matchType: v.optional(v.union(v.literal("any"), v.literal("all"), v.literal("exact"))),
      
      // Time-based
      schedule: v.optional(v.string()), // Cron expression
      
      // Idle timeout
      idleMinutes: v.optional(v.number()),
    }),
    
    // Metadata
    createdAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_org_id", ["orgId"])
    .index("by_trigger_type", ["triggerType"]),

  automation_conditions: defineTable({
    orgId: v.string(),
    workflowId: v.id("automation_workflows"),
    
    // Condition details
    conditionType: v.union(
      v.literal("contains_keywords"),
      v.literal("priority"),
      v.literal("tags"),
      v.literal("customer_tier"),
      v.literal("conversation_age"),
      v.literal("message_count"),
      v.literal("sentiment_score"),
      v.literal("assigned_to"),
      v.literal("channel_type"),
      v.literal("custom_field")
    ),
    
    // Operator
    operator: v.union(
      v.literal("equals"),
      v.literal("not_equals"),
      v.literal("contains"),
      v.literal("not_contains"),
      v.literal("greater_than"),
      v.literal("less_than"),
      v.literal("in"),
      v.literal("not_in")
    ),
    
    // Value (flexible type)
    value: v.any(),
    
    // Logic
    logicOperator: v.optional(v.union(v.literal("AND"), v.literal("OR"))),
    
    // Metadata
    createdAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_org_id", ["orgId"])
    .index("by_condition_type", ["conditionType"]),

  automation_actions: defineTable({
    orgId: v.string(),
    workflowId: v.id("automation_workflows"),
    
    // Execution order
    order: v.number(),
    
    // Action type
    actionType: v.union(
      v.literal("assign_agent"),
      v.literal("send_email"),
      v.literal("handoff_to_human"),
      v.literal("close_conversation"),
      v.literal("notify_slack"),
      v.literal("add_tag"),
      v.literal("remove_tag"),
      v.literal("set_priority"),
      v.literal("create_note"),
      v.literal("send_message"),
      v.literal("update_field"),
      v.literal("wait"),
      v.literal("webhook")
    ),
    
    // Action configuration
    config: v.object({
      // Assign agent
      agentId: v.optional(v.string()),
      assignmentMethod: v.optional(v.string()), // "specific", "round_robin", "least_active"
      
      // Send email
      emailTemplateId: v.optional(v.id("email_templates")),
      emailTo: v.optional(v.string()),
      emailSubject: v.optional(v.string()),
      emailBody: v.optional(v.string()),
      
      // Slack
      slackChannelId: v.optional(v.string()),
      slackMessage: v.optional(v.string()),
      
      // Tags
      tags: v.optional(v.array(v.string())),
      
      // Priority
      priority: v.optional(v.string()),
      
      // Note
      noteContent: v.optional(v.string()),
      
      // Message
      messageContent: v.optional(v.string()),
      
      // Field update
      fieldName: v.optional(v.string()),
      fieldValue: v.optional(v.any()),
      
      // Wait
      waitSeconds: v.optional(v.number()),
      
      // Webhook
      webhookUrl: v.optional(v.string()),
      webhookMethod: v.optional(v.string()),
      webhookHeaders: v.optional(v.any()),
      webhookBody: v.optional(v.any()),
    }),
    
    // Retry settings
    retryOnFailure: v.boolean(),
    maxRetries: v.number(),
    
    // Metadata
    createdAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_org_id", ["orgId"])
    .index("by_workflow_order", ["workflowId", "order"]),

  automation_executions: defineTable({
    orgId: v.string(),
    workflowId: v.id("automation_workflows"),
    
    // Trigger context
    triggeredBy: v.union(v.literal("event"), v.literal("manual"), v.literal("scheduled")),
    triggerData: v.optional(v.any()),
    
    // Target
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.optional(v.id("unified_messages")),
    customerId: v.optional(v.id("unified_customers")),
    
    // Execution status
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Progress
    currentStep: v.number(),
    totalSteps: v.number(),
    
    // Results
    actionsExecuted: v.number(),
    actionsFailed: v.number(),
    
    // Error tracking
    errorMessage: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    
    // Retry tracking
    retryCount: v.number(),
    
    // Timestamps
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_started_at", ["startedAt"]),

  automation_logs: defineTable({
    orgId: v.string(),
    workflowId: v.id("automation_workflows"),
    executionId: v.id("automation_executions"),
    
    // Log level
    level: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("debug")
    ),
    
    // Log details
    step: v.string(), // Trigger, condition, action name
    message: v.string(),
    details: v.optional(v.any()),
    
    // Action-specific
    actionType: v.optional(v.string()),
    actionResult: v.optional(v.any()),
    
    // Error details
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    
    // Timestamp
    timestamp: v.number(),
  })
    .index("by_execution_id", ["executionId"])
    .index("by_workflow_id", ["workflowId"])
    .index("by_org_id", ["orgId"])
    .index("by_level", ["level"])
    .index("by_org_timestamp", ["orgId", "timestamp"]),

  // ─── CSAT System ───────────────────────────────────────────────────────────
  csat_ratings: defineTable({
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    customerId: v.optional(v.id("unified_customers")),
    
    // Rating details
    ratingType: v.union(
      v.literal("stars"),       // 1-5 stars
      v.literal("emoji"),       // 😞 😐 🙂 😊 😍
      v.literal("thumbs"),      // 👍 👎
      v.literal("nps")          // 0-10 Net Promoter Score
    ),
    
    // Score (normalized)
    score: v.number(), // 1-5 for consistency
    rawScore: v.optional(v.number()), // Original score (e.g., 0-10 for NPS)
    
    // Feedback
    feedbackComment: v.optional(v.string()),
    feedbackCategory: v.optional(v.union(
      v.literal("response_time"),
      v.literal("issue_resolution"),
      v.literal("agent_knowledge"),
      v.literal("agent_friendliness"),
      v.literal("overall_experience"),
      v.literal("other")
    )),
    
    // Context
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    
    // Survey details
    surveyId: v.optional(v.id("csat_surveys")),
    surveyToken: v.optional(v.string()), // Unique token for survey link
    
    // Metadata
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    
    // Tags for analysis
    tags: v.optional(v.array(v.string())),
    
    // Timestamps
    ratedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_customer_id", ["customerId"])
    .index("by_agent_id", ["agentId"])
    .index("by_survey_id", ["surveyId"])
    .index("by_survey_token", ["surveyToken"])
    .index("by_org_rated", ["orgId", "ratedAt"])
    .index("by_org_score", ["orgId", "score"]),

  csat_surveys: defineTable({
    orgId: v.string(),
    
    // Survey configuration
    name: v.string(),
    description: v.optional(v.string()),
    
    // Survey type
    surveyType: v.union(
      v.literal("post_conversation"),
      v.literal("periodic"),
      v.literal("triggered"),
      v.literal("manual")
    ),
    
    // Questions
    ratingType: v.union(
      v.literal("stars"),
      v.literal("emoji"),
      v.literal("thumbs"),
      v.literal("nps")
    ),
    primaryQuestion: v.string(), // e.g., "How satisfied are you with our support?"
    followupQuestion: v.optional(v.string()), // e.g., "What could we improve?"
    
    // Trigger conditions
    triggerConditions: v.optional(v.object({
      afterConversationClosed: v.optional(v.boolean()),
      afterMinutes: v.optional(v.number()),
      forChannels: v.optional(v.array(v.string())),
      forPriorities: v.optional(v.array(v.string())),
    })),
    
    // Settings
    isActive: v.boolean(),
    allowComments: v.boolean(),
    requireComments: v.boolean(),
    showAgentName: v.boolean(),
    
    // Email settings
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    emailFromName: v.optional(v.string()),
    
    // Link settings
    surveyUrl: v.optional(v.string()),
    thankYouMessage: v.string(),
    
    // Statistics
    totalSent: v.number(),
    totalResponses: v.number(),
    responseRate: v.number(),
    avgScore: v.optional(v.number()),
    
    // Metadata
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"])
    .index("by_survey_type", ["surveyType"]),

  csat_analytics: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    
    // Overall metrics
    totalRatings: v.number(),
    avgScore: v.number(), // 1-5
    
    // Score distribution
    score1Count: v.number(),
    score2Count: v.number(),
    score3Count: v.number(),
    score4Count: v.number(),
    score5Count: v.number(),
    
    // CSAT calculation
    csatScore: v.number(), // Percentage of 4-5 ratings
    
    // NPS calculation (if using NPS)
    npsScore: v.optional(v.number()), // -100 to 100
    promoterCount: v.optional(v.number()), // 9-10
    passiveCount: v.optional(v.number()), // 7-8
    detractorCount: v.optional(v.number()), // 0-6
    
    // Feedback analysis
    totalComments: v.number(),
    negativeComments: v.number(), // Ratings 1-2
    positiveComments: v.number(), // Ratings 4-5
    
    // Category breakdown
    categoryBreakdown: v.optional(v.object({
      response_time: v.optional(v.number()),
      issue_resolution: v.optional(v.number()),
      agent_knowledge: v.optional(v.number()),
      agent_friendliness: v.optional(v.number()),
      overall_experience: v.optional(v.number()),
    })),
    
    // Agent performance
    topAgents: v.optional(v.array(v.object({
      agentId: v.string(),
      agentName: v.string(),
      avgScore: v.number(),
      totalRatings: v.number(),
    }))),
    
    // Trends
    trendDirection: v.optional(v.union(v.literal("up"), v.literal("down"), v.literal("stable"))),
    trendPercentage: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_date", ["date"]),

  // ─── Notification Service ──────────────────────────────────────────────────
  notification_templates: defineTable({
    orgId: v.optional(v.string()), // null for system templates
    
    // Template details
    name: v.string(),
    templateType: v.union(
      v.literal("new_message"),
      v.literal("human_handoff"),
      v.literal("ticket_closed"),
      v.literal("subscription_expiring"),
      v.literal("invitation_email"),
      v.literal("password_reset"),
      v.literal("digest_email"),
      v.literal("custom")
    ),
    
    // Email content
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
    
    // Template variables
    variables: v.array(v.object({
      name: v.string(),
      description: v.string(),
      defaultValue: v.optional(v.string()),
      required: v.boolean(),
    })),
    
    // Settings
    isActive: v.boolean(),
    isDefault: v.boolean(), // Is this the default template for this type
    
    // Metadata
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_template_type", ["templateType"])
    .index("by_org_type", ["orgId", "templateType"]),

  notification_queue: defineTable({
    orgId: v.string(),
    
    // Queue details
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Notification details
    notificationType: v.string(),
    templateId: v.optional(v.id("notification_templates")),
    
    // Recipient
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    recipientId: v.optional(v.string()),
    
    // Content
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
    
    // Template variables used
    variables: v.optional(v.any()),
    
    // Context
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    userId: v.optional(v.string()),
    
    // Retry logic
    attempts: v.number(),
    maxAttempts: v.number(),
    nextRetryAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    
    // External IDs
    resendId: v.optional(v.string()),
    
    // Timestamps
    scheduledFor: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_priority", ["priority"])
    .index("by_scheduled_for", ["scheduledFor"])
    .index("by_recipient_email", ["recipientEmail"]),

  notification_logs: defineTable({
    orgId: v.string(),
    queueId: v.id("notification_queue"),
    
    // Event details
    event: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    
    // Event data
    details: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    
    // External tracking
    resendEventId: v.optional(v.string()),
    
    // Timestamp
    timestamp: v.number(),
  })
    .index("by_queue_id", ["queueId"])
    .index("by_org_id", ["orgId"])
    .index("by_event", ["event"])
    .index("by_org_timestamp", ["orgId", "timestamp"]),

  // ─── Enterprise Analytics ──────────────────────────────────────────────────
  enterprise_analytics: defineTable({
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
    
    // Response metrics
    avgResponseTimeMs: v.number(),
    avgFirstResponseTimeMs: v.number(),
    avgResolutionTimeMs: v.number(),
    
    // Volume metrics
    totalConversations: v.number(),
    newConversations: v.number(),
    resolvedConversations: v.number(),
    openConversations: v.number(),
    
    // AI metrics
    aiHandledConversations: v.number(),
    aiAccuracyRate: v.number(), // % of successful AI responses
    humanHandoffRate: v.number(), // % requiring human intervention
    humanHandoffCount: v.number(),
    
    // Agent metrics
    activeAgents: v.number(),
    avgConversationsPerAgent: v.number(),
    
    // CSAT metrics
    avgCsatScore: v.number(),
    totalCsatRatings: v.number(),
    
    // Sentiment metrics
    avgSentimentScore: v.number(),
    positiveCount: v.number(),
    negativeCount: v.number(),
    neutralCount: v.number(),
    
    // Cost metrics
    totalTokensUsed: v.number(),
    totalCostUSD: v.number(),
    avgCostPerConversation: v.number(),
    
    // Revenue metrics (optional)
    totalRevenue: v.optional(v.number()),
    avgRevenuePerConversation: v.optional(v.number()),
    
    // Channel breakdown
    channelBreakdown: v.object({
      email: v.number(),
      chat: v.number(),
      phone: v.number(),
      social: v.number(),
      other: v.number(),
    }),
    
    // Priority breakdown
    priorityBreakdown: v.object({
      low: v.number(),
      medium: v.number(),
      high: v.number(),
      urgent: v.number(),
    }),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_date", ["date"])
    .index("by_org_id", ["orgId"]),

  analytics_metrics: defineTable({
    orgId: v.string(),
    
    // Metric type
    metricType: v.union(
      v.literal("response_time"),
      v.literal("resolution_time"),
      v.literal("ai_accuracy"),
      v.literal("handoff_rate"),
      v.literal("csat_score"),
      v.literal("sentiment_score"),
      v.literal("conversation_volume"),
      v.literal("token_cost"),
      v.literal("revenue")
    ),
    
    // Value
    value: v.number(),
    
    // Context
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    agentId: v.optional(v.string()),
    
    // Metadata
    metadata: v.optional(v.any()),
    
    // Timestamp
    timestamp: v.number(),
    date: v.string(), // YYYY-MM-DD
  })
    .index("by_org_date", ["orgId", "date"])
    .index("by_org_type", ["orgId", "metricType"])
    .index("by_org_type_date", ["orgId", "metricType", "date"])
    .index("by_timestamp", ["timestamp"]),
});
