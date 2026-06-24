/**
 * Notification Queue Management
 * Handle queueing and sending of notifications with retry logic
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get queued notifications
 */
export const getQueuedNotifications = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("notification_queue")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc");

    if (args.status) {
      query = ctx.db
        .query("notification_queue")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status as any)
        )
        .order("desc");
    }

    return await query.take(args.limit || 50);
  },
});

/**
 * Get notification details
 */
export const getNotification = query({
  args: {
    notificationId: v.id("notification_queue"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Get logs
    const logs = await ctx.db
      .query("notification_logs")
      .withIndex("by_queue_id", (q) => q.eq("queueId", args.notificationId))
      .order("asc")
      .collect();

    return {
      ...notification,
      logs,
    };
  },
});

/**
 * Get notification statistics
 */
export const getNotificationStats = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const notifications = await ctx.db
      .query("notification_queue")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("createdAt"), cutoffDate))
      .collect();

    const total = notifications.length;
    const sent = notifications.filter((n) => n.status === "sent").length;
    const failed = notifications.filter((n) => n.status === "failed").length;
    const pending = notifications.filter((n) => n.status === "pending").length;
    const processing = notifications.filter((n) => n.status === "processing").length;

    // Calculate success rate
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    // Group by type
    const byType = notifications.reduce((acc: any, n) => {
      acc[n.notificationType] = (acc[n.notificationType] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      sent,
      failed,
      pending,
      processing,
      successRate,
      byType,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Queue a notification
 */
export const queueNotification = mutation({
  args: {
    orgId: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    notificationType: v.string(),
    templateId: v.optional(v.id("notification_templates")),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    recipientId: v.optional(v.string()),
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
    variables: v.optional(v.any()),
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    userId: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const queueId = await ctx.db.insert("notification_queue", {
      orgId: args.orgId,
      priority: args.priority,
      status: "pending",
      notificationType: args.notificationType,
      templateId: args.templateId,
      recipientEmail: args.recipientEmail,
      recipientName: args.recipientName,
      recipientId: args.recipientId,
      subject: args.subject,
      htmlBody: args.htmlBody,
      textBody: args.textBody,
      variables: args.variables,
      conversationId: args.conversationId,
      customerId: args.customerId,
      userId: args.userId,
      attempts: 0,
      maxAttempts: args.maxAttempts || 3,
      scheduledFor: args.scheduledFor,
      createdAt: now,
    });

    // Log queued event
    await ctx.db.insert("notification_logs", {
      orgId: args.orgId,
      queueId,
      event: "queued",
      timestamp: now,
    });

    return queueId;
  },
});

/**
 * Process notification queue (called by cron or manual trigger)
 */
export const processQueue = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const now = Date.now();

    // Get pending notifications ready to send
    const pending = await ctx.runQuery(internal.notifications.queue.getPendingNotifications, {
      limit,
    });

    let processed = 0;
    let failed = 0;

    for (const notification of pending) {
      try {
        // Mark as processing
        await ctx.runMutation(internal.notifications.queue.updateNotificationStatus, {
          notificationId: notification._id,
          status: "processing",
        });

        // Send via Resend
        const result = await sendViaResend(
          notification.recipientEmail,
          notification.subject,
          notification.htmlBody,
          notification.textBody
        );

        if (result.success) {
          // Mark as sent
          await ctx.runMutation(internal.notifications.queue.markAsSent, {
            notificationId: notification._id,
            resendId: result.id,
          });
          processed++;
        } else {
          // Handle failure with retry
          await ctx.runMutation(internal.notifications.queue.handleFailure, {
            notificationId: notification._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (error: any) {
        // Handle exception
        await ctx.runMutation(internal.notifications.queue.handleFailure, {
          notificationId: notification._id,
          error: error.message,
        });
        failed++;
      }
    }

    return { processed, failed, total: pending.length };
  },
});

// ─── Internal Queries ───────────────────────────────────────────────────────

export const getPendingNotifications = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db
      .query("notification_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.or(
          q.eq(q.field("scheduledFor"), undefined),
          q.lte(q.field("scheduledFor"), now)
        )
      )
      .order("asc")
      .take(args.limit);
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

export const updateNotificationStatus = internalMutation({
  args: {
    notificationId: v.id("notification_queue"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: args.status as any,
      processedAt: args.status === "processing" ? Date.now() : undefined,
    });

    // Log event
    await ctx.db.insert("notification_logs", {
      orgId: (await ctx.db.get(args.notificationId))!.orgId,
      queueId: args.notificationId,
      event: args.status as any,
      timestamp: Date.now(),
    });
  },
});

export const markAsSent = internalMutation({
  args: {
    notificationId: v.id("notification_queue"),
    resendId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notification = await ctx.db.get(args.notificationId);

    await ctx.db.patch(args.notificationId, {
      status: "sent",
      resendId: args.resendId,
      sentAt: now,
    });

    // Log sent event
    await ctx.db.insert("notification_logs", {
      orgId: notification!.orgId,
      queueId: args.notificationId,
      event: "sent",
      details: { resendId: args.resendId },
      timestamp: now,
    });
  },
});

export const handleFailure = internalMutation({
  args: {
    notificationId: v.id("notification_queue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) return;

    const attempts = notification.attempts + 1;
    const shouldRetry = attempts < notification.maxAttempts;

    if (shouldRetry) {
      // Calculate next retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 3600000); // Max 1 hour
      const nextRetryAt = now + backoffMs;

      await ctx.db.patch(args.notificationId, {
        status: "pending",
        attempts,
        lastError: args.error,
        nextRetryAt,
      });

      // Log retry scheduled
      await ctx.db.insert("notification_logs", {
        orgId: notification.orgId,
        queueId: args.notificationId,
        event: "failed",
        errorMessage: args.error,
        details: { attempts, nextRetryAt, willRetry: true },
        timestamp: now,
      });
    } else {
      // Max attempts reached, mark as failed
      await ctx.db.patch(args.notificationId, {
        status: "failed",
        attempts,
        lastError: args.error,
        failedAt: now,
      });

      // Log permanent failure
      await ctx.db.insert("notification_logs", {
        orgId: notification.orgId,
        queueId: args.notificationId,
        event: "failed",
        errorMessage: args.error,
        details: { attempts, maxAttemptsReached: true },
        timestamp: now,
      });
    }
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Send email via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@example.com";
    const FROM_NAME = process.env.RESEND_FROM_NAME || "Echo Support";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel a notification
 */
export const cancelNotification = mutation({
  args: {
    notificationId: v.id("notification_queue"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.status !== "pending") {
      throw new Error("Can only cancel pending notifications");
    }

    await ctx.db.patch(args.notificationId, {
      status: "cancelled",
    });

    // Log cancellation
    await ctx.db.insert("notification_logs", {
      orgId: notification.orgId,
      queueId: args.notificationId,
      event: "failed",
      errorMessage: "Cancelled by user",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Retry a failed notification
 */
export const retryNotification = mutation({
  args: {
    notificationId: v.id("notification_queue"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.status !== "failed") {
      throw new Error("Can only retry failed notifications");
    }

    await ctx.db.patch(args.notificationId, {
      status: "pending",
      attempts: 0, // Reset attempts
      lastError: undefined,
      nextRetryAt: undefined,
    });

    return { success: true };
  },
});
