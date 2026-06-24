/**
 * Webhook System - Delivery Engine
 * Handle webhook delivery with retry logic
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import crypto from "crypto";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get webhook deliveries
 */
export const getWebhookDeliveries = query({
  args: {
    webhookId: v.id("webhooks"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("webhook_deliveries")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", args.webhookId))
      .order("desc");

    let deliveries = await query.take(args.limit || 50);

    if (args.status) {
      deliveries = deliveries.filter((d) => d.status === args.status);
    }

    return deliveries;
  },
});

/**
 * Get single delivery
 */
export const getDelivery = query({
  args: {
    deliveryId: v.id("webhook_deliveries"),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return null;

    // Get logs
    const logs = await ctx.db
      .query("webhook_logs")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .order("asc")
      .collect();

    return {
      ...delivery,
      logs,
    };
  },
});

/**
 * Get recent deliveries for org
 */
export const getRecentDeliveries = query({
  args: {
    orgId: v.string(),
    event: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let deliveries = await ctx.db
      .query("webhook_deliveries")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit || 100);

    if (args.event) {
      deliveries = deliveries.filter((d) => d.event === args.event);
    }

    return deliveries;
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Trigger webhook event
 */
export const triggerWebhook = action({
  args: {
    orgId: v.string(),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Get active webhooks for this org and event
    const webhooks = await ctx.runQuery(internal.webhooks.delivery.getActiveWebhooks, {
      orgId: args.orgId,
      event: args.event,
    });

    const deliveries: Id<"webhook_deliveries">[] = [];

    for (const webhook of webhooks) {
      // Create delivery record
      const deliveryId = await ctx.runMutation(
        internal.webhooks.delivery.createDelivery,
        {
          webhookId: webhook._id,
          orgId: args.orgId,
          event: args.event,
          payload: args.payload,
          maxAttempts: webhook.retryPolicy.maxRetries,
        }
      );

      deliveries.push(deliveryId);
    }

    return { deliveries: deliveries.length };
  },
});

/**
 * Process webhook deliveries (called by cron or manually)
 */
export const processDeliveries = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get pending deliveries
    const pending = await ctx.runQuery(internal.webhooks.delivery.getPendingDeliveries, {
      limit,
    });

    let processed = 0;
    let failed = 0;

    for (const delivery of pending) {
      try {
        // Mark as sending
        await ctx.runMutation(internal.webhooks.delivery.markAsSending, {
          deliveryId: delivery._id,
        });

        // Get webhook config
        const webhook = await ctx.runQuery(internal.webhooks.delivery.getWebhookConfig, {
          webhookId: delivery.webhookId,
        });

        if (!webhook) {
          await ctx.runMutation(internal.webhooks.delivery.markAsFailed, {
            deliveryId: delivery._id,
            error: "Webhook not found",
          });
          failed++;
          continue;
        }

        // Send webhook
        const result = await sendWebhook(
          webhook.url,
          delivery.payload,
          webhook.secret,
          webhook.headers || [],
          webhook.timeout
        );

        if (result.success) {
          await ctx.runMutation(internal.webhooks.delivery.markAsSuccess, {
            deliveryId: delivery._id,
            response: result.response!,
          });
          processed++;
        } else {
          await ctx.runMutation(internal.webhooks.delivery.handleFailure, {
            deliveryId: delivery._id,
            error: result.error || "Unknown error",
            retryDelay: webhook.retryPolicy.retryDelay,
            exponentialBackoff: webhook.retryPolicy.exponentialBackoff,
          });
          failed++;
        }
      } catch (error: any) {
        await ctx.runMutation(internal.webhooks.delivery.handleFailure, {
          deliveryId: delivery._id,
          error: error.message,
          retryDelay: 1000,
          exponentialBackoff: true,
        });
        failed++;
      }
    }

    return { processed, failed, total: pending.length };
  },
});

/**
 * Retry failed delivery
 */
export const retryDelivery = mutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deliveryId, {
      status: "pending",
      attempts: 0,
      error: undefined,
      nextRetryAt: undefined,
    });

    return { success: true };
  },
});

/**
 * Cancel pending delivery
 */
export const cancelDelivery = mutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deliveryId, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// ─── Internal Queries ───────────────────────────────────────────────────────

export const getActiveWebhooks = internalQuery({
  args: {
    orgId: v.string(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true)
      )
      .collect();

    // Filter webhooks that listen to this event
    return webhooks.filter(
      (webhook) =>
        webhook.events.includes(args.event) || webhook.events.includes("*")
    );
  },
});

export const getPendingDeliveries = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db
      .query("webhook_deliveries")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.or(
          q.eq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .order("asc")
      .take(args.limit);
  },
});

export const getWebhookConfig = internalQuery({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.webhookId);
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

export const createDelivery = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    orgId: v.string(),
    event: v.string(),
    payload: v.any(),
    maxAttempts: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const deliveryId = await ctx.db.insert("webhook_deliveries", {
      webhookId: args.webhookId,
      orgId: args.orgId,
      event: args.event,
      payload: args.payload,
      status: "pending",
      attempts: 0,
      maxAttempts: args.maxAttempts,
      triggeredAt: now,
      createdAt: now,
    });

    // Update webhook stats
    const webhook = await ctx.db.get(args.webhookId);
    if (webhook) {
      await ctx.db.patch(args.webhookId, {
        totalDeliveries: webhook.totalDeliveries + 1,
        lastTriggeredAt: now,
      });
    }

    // Log event
    await ctx.db.insert("webhook_logs", {
      webhookId: args.webhookId,
      deliveryId,
      orgId: args.orgId,
      level: "info",
      message: "Webhook delivery queued",
      timestamp: now,
    });

    return deliveryId;
  },
});

export const markAsSending = internalMutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return;

    await ctx.db.patch(args.deliveryId, {
      status: "sending",
      attempts: delivery.attempts + 1,
    });

    // Log event
    await ctx.db.insert("webhook_logs", {
      webhookId: delivery.webhookId,
      deliveryId: args.deliveryId,
      orgId: delivery.orgId,
      level: "info",
      message: `Attempt ${delivery.attempts + 1} of ${delivery.maxAttempts}`,
      timestamp: Date.now(),
    });
  },
});

export const markAsSuccess = internalMutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
    response: v.object({
      statusCode: v.number(),
      headers: v.optional(v.any()),
      body: v.optional(v.string()),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return;

    const now = Date.now();

    await ctx.db.patch(args.deliveryId, {
      status: "success",
      response: args.response,
      deliveredAt: now,
    });

    // Update webhook stats
    const webhook = await ctx.db.get(delivery.webhookId);
    if (webhook) {
      await ctx.db.patch(delivery.webhookId, {
        successfulDeliveries: webhook.successfulDeliveries + 1,
      });
    }

    // Log success
    await ctx.db.insert("webhook_logs", {
      webhookId: delivery.webhookId,
      deliveryId: args.deliveryId,
      orgId: delivery.orgId,
      level: "info",
      message: `Delivered successfully (${args.response.statusCode})`,
      details: { duration: args.response.duration },
      timestamp: now,
    });
  },
});

export const markAsFailed = internalMutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return;

    await ctx.db.patch(args.deliveryId, {
      status: "failed",
      error: args.error,
    });

    // Update webhook stats
    const webhook = await ctx.db.get(delivery.webhookId);
    if (webhook) {
      await ctx.db.patch(delivery.webhookId, {
        failedDeliveries: webhook.failedDeliveries + 1,
      });
    }

    // Log failure
    await ctx.db.insert("webhook_logs", {
      webhookId: delivery.webhookId,
      deliveryId: args.deliveryId,
      orgId: delivery.orgId,
      level: "error",
      message: "Webhook delivery failed",
      details: { error: args.error },
      timestamp: Date.now(),
    });
  },
});

export const handleFailure = internalMutation({
  args: {
    deliveryId: v.id("webhook_deliveries"),
    error: v.string(),
    retryDelay: v.number(),
    exponentialBackoff: v.boolean(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return;

    const shouldRetry = delivery.attempts < delivery.maxAttempts;

    if (shouldRetry) {
      // Calculate next retry
      let backoffMs = args.retryDelay;
      if (args.exponentialBackoff) {
        backoffMs = args.retryDelay * Math.pow(2, delivery.attempts);
      }
      backoffMs = Math.min(backoffMs, 3600000); // Max 1 hour

      const nextRetryAt = Date.now() + backoffMs;

      await ctx.db.patch(args.deliveryId, {
        status: "pending",
        error: args.error,
        nextRetryAt,
      });

      // Log retry scheduled
      await ctx.db.insert("webhook_logs", {
        webhookId: delivery.webhookId,
        deliveryId: args.deliveryId,
        orgId: delivery.orgId,
        level: "warning",
        message: "Retry scheduled",
        details: { nextRetryAt, error: args.error },
        timestamp: Date.now(),
      });
    } else {
      // Max attempts reached
      await ctx.db.patch(args.deliveryId, {
        status: "failed",
        error: args.error,
      });

      // Update webhook stats
      const webhook = await ctx.db.get(delivery.webhookId);
      if (webhook) {
        await ctx.db.patch(delivery.webhookId, {
          failedDeliveries: webhook.failedDeliveries + 1,
        });
      }

      // Log permanent failure
      await ctx.db.insert("webhook_logs", {
        webhookId: delivery.webhookId,
        deliveryId: args.deliveryId,
        orgId: delivery.orgId,
        level: "error",
        message: "Max delivery attempts reached",
        details: { error: args.error, attempts: delivery.attempts },
        timestamp: Date.now(),
      });
    }
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Send webhook HTTP request
 */
async function sendWebhook(
  url: string,
  payload: any,
  secret: string,
  headers: Array<{ key: string; value: string }>,
  timeout: number
): Promise<{
  success: boolean;
  response?: {
    statusCode: number;
    headers: any;
    body: string;
    duration: number;
  };
  error?: string;
}> {
  try {
    const startTime = Date.now();

    // Generate signature
    const signature = generateSignature(JSON.stringify(payload), secret);

    // Build headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Echo-Webhooks/1.0",
      "X-Webhook-Signature": signature,
      "X-Webhook-Timestamp": Date.now().toString(),
    };

    // Add custom headers
    headers.forEach((header) => {
      requestHeaders[header.key] = header.value;
    });

    // Send request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const body = await response.text();

    if (response.ok) {
      return {
        success: true,
        response: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
          duration,
        },
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${body}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  },
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
