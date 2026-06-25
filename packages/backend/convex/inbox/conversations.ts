// @ts-nocheck
/**
 * Unified Inbox - Conversations Management
 * Handles conversations across all channels
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Get all conversations for inbox with filters
 */
export const getInboxConversations = query({
  args: {
    orgId: v.string(),
    channelId: v.optional(v.id("channels")),
    status: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.union(v.literal("me"), v.literal("unassigned"), v.string())),
    priority: v.optional(v.array(v.string())),
    hasUnread: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("unified_conversations")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId));

    // Apply filters
    let conversations = await query.collect();

    // Filter by channel
    if (args.channelId) {
      conversations = conversations.filter(c => c.channelId === args.channelId);
    }

    // Filter by status
    if (args.status && args.status.length > 0) {
      conversations = conversations.filter(c => args.status!.includes(c.status));
    }

    // Filter by assignment
    if (args.assignedTo) {
      if (args.assignedTo === "me" && args.userId) {
        conversations = conversations.filter(c => c.assignedTo === args.userId);
      } else if (args.assignedTo === "unassigned") {
        conversations = conversations.filter(c => !c.assignedTo);
      } else if (args.assignedTo !== "me") {
        conversations = conversations.filter(c => c.assignedTo === args.assignedTo);
      }
    }

    // Filter by priority
    if (args.priority && args.priority.length > 0) {
      conversations = conversations.filter(c => args.priority!.includes(c.priority));
    }

    // Filter by unread
    if (args.hasUnread) {
      conversations = conversations.filter(c => c.unreadCount > 0);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      conversations = conversations.filter(c =>
        args.tags!.some(tag => c.tags.includes(tag))
      );
    }

    // Sort conversations
    const sortOrder = args.sortOrder || "desc";
    const sortBy = args.sortBy || "lastMessageAt";

    conversations.sort((a, b) => {
      let aVal: any = a[sortBy as keyof typeof a];
      let bVal: any = b[sortBy as keyof typeof b];

      if (sortBy === "priority") {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder];
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder];
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Apply limit
    const limit = args.limit || 50;
    conversations = conversations.slice(0, limit);

    // Enrich with channel data
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const channel = await ctx.db.get(conv.channelId);
        return {
          ...conv,
          channel: channel ? {
            name: channel.name,
            type: channel.type,
          } : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single conversation with messages
 */
export const getConversation = query({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Get messages
    const messages = await ctx.db
      .query("unified_messages")
      .withIndex("by_conversation_sent", q =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    // Get customer
    const customer = await ctx.db.get(conversation.customerId);

    // Get channel
    const channel = await ctx.db.get(conversation.channelId);

    // Get assigned agent
    let assignedAgent = null;
    if (conversation.assignedTo) {
      // Would fetch from users table
      assignedAgent = { id: conversation.assignedTo, name: "Agent" };
    }

    return {
      ...conversation,
      messages,
      customer,
      channel,
      assignedAgent,
    };
  },
});

/**
 * Send a message in a conversation
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    content: v.string(),
    contentType: v.optional(v.string()),
    senderId: v.string(),
    senderName: v.string(),
    senderType: v.union(v.literal("agent"), v.literal("bot")),
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
      storageId: v.optional(v.id("_storage")),
    }))),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("unified_messages", {
      orgId: conversation.orgId,
      conversationId: args.conversationId,
      channelId: conversation.channelId,
      customerId: conversation.customerId,
      content: args.content,
      contentType: (args.contentType as any) || "text",
      senderType: args.senderType,
      senderId: args.senderId,
      senderName: args.senderName,
      status: "sent",
      attachments: args.attachments,
      sentAt: now,
      createdAt: now,
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageText: args.content,
      lastMessageAt: now,
      lastMessageFrom: args.senderType,
      totalMessages: conversation.totalMessages + 1,
      updatedAt: now,
    });

    // Update search index
    await ctx.scheduler.runAfter(0, internal.inbox.search.updateSearchIndex, {
      conversationId: args.conversationId,
    });

    return { messageId, success: true };
  },
});

/**
 * Mark conversation as read
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return { success: false };

    await ctx.db.patch(args.conversationId, {
      unreadCount: 0,
      updatedAt: Date.now(),
    });

    // Mark messages as read
    const messages = await ctx.db
      .query("unified_messages")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("status"), "delivered"))
      .collect();

    for (const message of messages) {
      await ctx.db.patch(message._id, {
        status: "read",
        readAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Assign conversation to agent
 */
export const assignConversation = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    assignedTo: v.string(),
    assignedBy: v.optional(v.string()),
    method: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const now = Date.now();

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      assignedTo: args.assignedTo,
      assignedAt: now,
      updatedAt: now,
    });

    // Create assignment record
    await ctx.db.insert("conversation_assignments", {
      orgId: conversation.orgId,
      conversationId: args.conversationId,
      assignedTo: args.assignedTo,
      assignedBy: args.assignedBy,
      assignmentMethod: (args.method as any) || "manual",
      status: "active",
      assignedAt: now,
      messagesHandled: 0,
    });

    return { success: true };
  },
});

/**
 * Update conversation status
 */
export const updateStatus = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    // Track resolution time
    if (args.status === "resolved" && !conversation.resolutionAt) {
      updates.resolutionAt = now;
      updates.resolutionTimeMs = now - conversation.startedAt;
    }

    await ctx.db.patch(args.conversationId, updates);

    return { success: true };
  },
});

/**
 * Update conversation priority
 */
export const updatePriority = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Add tags to conversation
 */
export const addTags = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const existingTags = new Set(conversation.tags);
    args.tags.forEach(tag => existingTags.add(tag));

    await ctx.db.patch(args.conversationId, {
      tags: Array.from(existingTags),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get unread counts by channel
 */
export const getUnreadCounts = query({
  args: {
    orgId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("unified_conversations")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Filter by assigned user if provided
    const filtered = args.userId
      ? conversations.filter(c => c.assignedTo === args.userId)
      : conversations;

    const counts = {
      total: 0,
      byChannel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    for (const conv of filtered) {
      if (conv.unreadCount > 0) {
        counts.total += conv.unreadCount;

        // By channel
        const channelKey = conv.channelType;
        counts.byChannel[channelKey] = (counts.byChannel[channelKey] || 0) + conv.unreadCount;

        // By status
        counts.byStatus[conv.status] = (counts.byStatus[conv.status] || 0) + conv.unreadCount;

        // By priority
        counts.byPriority[conv.priority] = (counts.byPriority[conv.priority] || 0) + conv.unreadCount;
      }
    }

    return counts;
  },
});

/**
 * Transfer conversation to another agent
 */
export const transferConversation = mutation({
  args: {
    conversationId: v.id("unified_conversations"),
    toUserId: v.string(),
    transferredBy: v.string(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const now = Date.now();

    // Create transfer record
    await ctx.db.insert("conversation_transfers", {
      orgId: conversation.orgId,
      conversationId: args.conversationId,
      fromUserId: conversation.assignedTo,
      toUserId: args.toUserId,
      transferredBy: args.transferredBy,
      reason: args.reason,
      notes: args.notes,
      status: "accepted", // Auto-accept for now
      requestedAt: now,
      respondedAt: now,
    });

    // Update assignment
    await ctx.db.patch(args.conversationId, {
      assignedTo: args.toUserId,
      assignedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
