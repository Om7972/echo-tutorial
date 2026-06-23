/**
 * Internal Collaboration - Notifications
 * Handles real-time notifications for mentions, assignments, and activities
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get user notifications
 */
export const getUserNotifications = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    isRead: v.optional(v.boolean()),
    type: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let notifications = await ctx.db
      .query("collaboration_notifications")
      .withIndex("by_org_user", q =>
        q.eq("orgId", args.orgId).eq("userId", args.userId)
      )
      .order("desc")
      .collect();

    // Filter by read status
    if (args.isRead !== undefined) {
      notifications = notifications.filter(n => n.isRead === args.isRead);
    }

    // Filter by type
    if (args.type && args.type.length > 0) {
      notifications = notifications.filter(n => args.type!.includes(n.type));
    }

    // Remove expired
    const now = Date.now();
    notifications = notifications.filter(n =>
      !n.expiresAt || n.expiresAt > now
    );

    const limit = args.limit || 50;
    return notifications.slice(0, limit);
  },
});

/**
 * Mark notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("collaboration_notifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.userId !== args.userId) {
      throw new Error("Notification not found or access denied");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("collaboration_notifications")
      .withIndex("by_user_read", q =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .collect();

    const now = Date.now();
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return { count: notifications.length, success: true };
  },
});

/**
 * Get unread count
 */
export const getUnreadCount = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("collaboration_notifications")
      .withIndex("by_user_read", q =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .collect();

    // Count by type
    const byType: Record<string, number> = {};
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      total: notifications.length,
      byType,
    };
  },
});

/**
 * Delete notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("collaboration_notifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.userId !== args.userId) {
      throw new Error("Notification not found or access denied");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

/**
 * Create generic notification (internal)
 */
export const createNotification = internalMutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("note_reply"),
      v.literal("status_change"),
      v.literal("due_date"),
      v.literal("escalation"),
      v.literal("approval_request")
    ),
    title: v.string(),
    message: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    noteId: v.optional(v.id("collaboration_notes")),
    assignmentId: v.optional(v.id("collaboration_assignments")),
    mentionId: v.optional(v.id("collaboration_mentions")),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("collaboration_notifications", {
      orgId: args.orgId,
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      conversationId: args.conversationId,
      noteId: args.noteId,
      assignmentId: args.assignmentId,
      mentionId: args.mentionId,
      actorId: args.actorId,
      actorName: args.actorName,
      isRead: false,
      actionUrl: args.actionUrl,
      actionText: args.actionText,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return { notificationId };
  },
});

/**
 * Create mention notifications (internal)
 */
export const createMentionNotifications = internalMutation({
  args: {
    noteId: v.id("collaboration_notes"),
    mentions: v.array(v.string()),
    mentionedBy: v.string(),
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const contentSnippet = args.content.substring(0, 100) + (args.content.length > 100 ? "..." : "");

    for (const userId of args.mentions) {
      // Create mention record
      const mentionId = await ctx.db.insert("collaboration_mentions", {
        orgId: args.orgId,
        noteId: args.noteId,
        conversationId: args.conversationId,
        mentionedUserId: userId,
        mentionedBy: args.mentionedBy,
        mentionContext: contentSnippet,
        isRead: false,
        isResolved: false,
        createdAt: Date.now(),
      });

      // Create notification
      await ctx.db.insert("collaboration_notifications", {
        orgId: args.orgId,
        userId: userId,
        type: "mention",
        title: "You were mentioned",
        message: contentSnippet,
        conversationId: args.conversationId,
        noteId: args.noteId,
        mentionId: mentionId,
        actorId: args.mentionedBy,
        isRead: false,
        actionUrl: `/conversations/${args.conversationId}#note-${args.noteId}`,
        actionText: "View note",
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Create assignment notification (internal)
 */
export const createAssignmentNotification = internalMutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    orgId: v.string(),
    userId: v.string(),
    conversationId: v.id("unified_conversations"),
    assignedBy: v.string(),
    assignmentType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("collaboration_notifications", {
      orgId: args.orgId,
      userId: args.userId,
      type: "assignment",
      title: "New Assignment",
      message: `You have been assigned as ${args.assignmentType}`,
      conversationId: args.conversationId,
      assignmentId: args.assignmentId,
      actorId: args.assignedBy,
      isRead: false,
      actionUrl: `/conversations/${args.conversationId}`,
      actionText: "View conversation",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get user mentions
 */
export const getUserMentions = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    isRead: v.optional(v.boolean()),
    isResolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let mentions = await ctx.db
      .query("collaboration_mentions")
      .withIndex("by_org_mentioned_user", q =>
        q.eq("orgId", args.orgId).eq("mentionedUserId", args.userId)
      )
      .order("desc")
      .collect();

    if (args.isRead !== undefined) {
      mentions = mentions.filter(m => m.isRead === args.isRead);
    }

    if (args.isResolved !== undefined) {
      mentions = mentions.filter(m => m.isResolved === args.isResolved);
    }

    const limit = args.limit || 50;
    return mentions.slice(0, limit);
  },
});

/**
 * Mark mention as read
 */
export const markMentionAsRead = mutation({
  args: {
    mentionId: v.id("collaboration_mentions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const mention = await ctx.db.get(args.mentionId);
    
    if (!mention || mention.mentionedUserId !== args.userId) {
      throw new Error("Mention not found or access denied");
    }

    await ctx.db.patch(args.mentionId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resolve mention
 */
export const resolveMention = mutation({
  args: {
    mentionId: v.id("collaboration_mentions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const mention = await ctx.db.get(args.mentionId);
    
    if (!mention || mention.mentionedUserId !== args.userId) {
      throw new Error("Mention not found or access denied");
    }

    await ctx.db.patch(args.mentionId, {
      isResolved: true,
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});
