import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Trigger Escalation Checker ───

export const checkAndTriggerEscalation = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageContent: v.string(),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return { escalated: false };

    // If already escalated or locked, skip
    if (conv.isLocked || conv.escalationReason) {
      return { escalated: false };
    }

    const now = Date.now();
    let shouldEscalate = false;
    let reason = "";
    let priority: "low" | "medium" | "high" = "medium";

    // 1. VIP Customer Check
    const profile = await ctx.db
      .query("customer_profiles")
      .withIndex("by_org_visitor", (q) => q.eq("orgId", conv.orgId).eq("visitorId", args.senderId))
      .unique();
    
    const isVip = 
      profile?.notes?.toLowerCase().includes("vip") || 
      profile?.name?.toLowerCase().includes("vip") || 
      args.senderId.toLowerCase().includes("vip");

    if (isVip) {
      shouldEscalate = true;
      reason = "vip_customer";
      priority = "high";
    }

    // 2. Negative Sentiment Check
    if (!shouldEscalate) {
      const negativeKeywords = [
        "angry", "terrible", "worst", "hate", "scam", "broken", "useless", 
        "refund", "chargeback", "cancel", "frustrated", "awful", "horrible",
        "human", "operator", "agent", "real person", "representative", "help"
      ];
      const lowerContent = args.messageContent.toLowerCase();
      const hasNegativeWord = negativeKeywords.some((word) => lowerContent.includes(word));
      
      if (hasNegativeWord) {
        shouldEscalate = true;
        reason = "negative_sentiment";
        priority = "high";
      }
    }

    // 3. Trigger Escalation Actions
    if (shouldEscalate) {
      await ctx.db.patch(args.conversationId, {
        status: "waiting",
        priority,
        isLocked: true, // Conversation lock
        lockedAt: now,
        escalationReason: reason,
        escalatedAt: now,
      });

      // Insert Transfer History
      await ctx.db.insert("transfer_history", {
        orgId: conv.orgId,
        conversationId: args.conversationId,
        fromAssignee: "ai",
        toAssignee: "operator_queue",
        transferredBy: "system",
        reason: `Auto-escalated: ${reason}`,
        timestamp: now,
      });

      // Create Notification
      await ctx.db.insert("notifications", {
        orgId: conv.orgId,
        title: "Escalation Alert",
        message: `Conversation escalated due to ${reason.replace("_", " ")}.`,
        conversationId: args.conversationId,
        type: "escalation",
        isRead: false,
        createdAt: now,
      });

      // Log Audit Event
      await ctx.db.insert("audit_logs", {
        orgId: conv.orgId,
        userId: "system",
        action: "auto_escalate",
        details: `Conversation auto-escalated to support queue. Trigger: ${reason}`,
        timestamp: now,
      });

      // Inject system message in conversation
      await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: "system",
        senderName: "System",
        senderType: "assistant",
        type: "system",
        content: `[System] This conversation has been escalated to our human support queue due to: ${reason.replace("_", " ")}.`,
        status: "sent",
        timestamp: now,
      });

      return { escalated: true, reason };
    }

    return { escalated: false };
  },
});

// ─── Handoff and Takeover Actions ───

export const escalateConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    reason: v.union(v.literal("negative_sentiment"), v.literal("low_confidence"), v.literal("vip_customer"), v.literal("manual")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const now = Date.now();

    await ctx.db.patch(args.conversationId, {
      status: "waiting",
      priority: args.priority,
      isLocked: true,
      lockedAt: now,
      escalationReason: args.reason,
      escalatedAt: now,
    });

    await ctx.db.insert("transfer_history", {
      orgId: conv.orgId,
      conversationId: args.conversationId,
      fromAssignee: "ai",
      toAssignee: "operator_queue",
      transferredBy: "system",
      reason: `Manual/Agent trigger: ${args.reason}`,
      timestamp: now,
    });

    await ctx.db.insert("notifications", {
      orgId: conv.orgId,
      title: "Conversation Escalated",
      message: `Handoff requested: ${args.reason}`,
      conversationId: args.conversationId,
      type: "escalation",
      isRead: false,
      createdAt: now,
    });

    await ctx.db.insert("audit_logs", {
      orgId: conv.orgId,
      userId: "system",
      action: "escalate",
      details: `Conversation escalated. Trigger: ${args.reason}`,
      timestamp: now,
    });

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: "system",
      senderName: "System",
      senderType: "assistant",
      type: "system",
      content: `[System] Escalated to queue. Reason: ${args.reason}`,
      status: "sent",
      timestamp: now,
    });
  },
});

export const takeoverConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    operatorId: v.string(),
    operatorName: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const now = Date.now();

    // Lock conversation to the operator
    await ctx.db.patch(args.conversationId, {
      assigneeId: args.operatorId,
      isLocked: true,
      lockedBy: args.operatorId,
      lockedAt: now,
    });

    // Insert Transfer History
    await ctx.db.insert("transfer_history", {
      orgId: conv.orgId,
      conversationId: args.conversationId,
      fromAssignee: conv.assigneeId || "operator_queue",
      toAssignee: args.operatorId,
      transferredBy: args.operatorId,
      reason: "Live human operator takeover",
      timestamp: now,
    });

    // Log Audit Event
    await ctx.db.insert("audit_logs", {
      orgId: conv.orgId,
      userId: args.operatorId,
      action: "takeover",
      details: `${args.operatorName} took over the conversation`,
      timestamp: now,
    });

    // Notify participants
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: "system",
      senderName: "System",
      senderType: "assistant",
      type: "system",
      content: `${args.operatorName} has joined the chat and taken over the conversation.`,
      status: "sent",
      timestamp: now,
    });
  },
});

export const releaseTakeover = mutation({
  args: {
    conversationId: v.id("conversations"),
    operatorId: v.string(),
    operatorName: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const now = Date.now();

    // Unlock conversation
    await ctx.db.patch(args.conversationId, {
      assigneeId: undefined,
      isLocked: false,
      lockedBy: undefined,
      lockedAt: undefined,
      escalationReason: undefined,
      escalatedAt: undefined,
    });

    // Insert Transfer History
    await ctx.db.insert("transfer_history", {
      orgId: conv.orgId,
      conversationId: args.conversationId,
      fromAssignee: args.operatorId,
      toAssignee: "ai",
      transferredBy: args.operatorId,
      reason: "Released takeover back to AI agent",
      timestamp: now,
    });

    // Log Audit Event
    await ctx.db.insert("audit_logs", {
      orgId: conv.orgId,
      userId: args.operatorId,
      action: "release",
      details: `${args.operatorName} handed conversation control back to AI agent`,
      timestamp: now,
    });

    // Notify participants
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: "system",
      senderName: "System",
      senderType: "assistant",
      type: "system",
      content: `[System] Control handed back to AI agent. Operator has left the chat.`,
      status: "sent",
      timestamp: now,
    });
  },
});

// ─── Typing Status Synchronization ───

export const setTypingStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    userName: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("typing_statuses")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: args.isTyping,
        lastUpdatedAt: now,
      });
    } else {
      await ctx.db.insert("typing_statuses", {
        conversationId: args.conversationId,
        userId: args.userId,
        userName: args.userName,
        isTyping: args.isTyping,
        lastUpdatedAt: now,
      });
    }
  },
});

// ─── Notification & Log Queries ───

export const listNotifications = query({
  args: {
    orgId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
  },
});

export const getTransferHistory = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transfer_history")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const getAuditLogs = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("audit_logs")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});
