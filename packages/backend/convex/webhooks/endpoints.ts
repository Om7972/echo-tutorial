/**
 * Webhook System - Endpoint Management
 * Manage webhook configurations
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all webhooks for org
 */
export const getWebhooks = query({
  args: {
    orgId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("webhooks")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", args.orgId).eq("isActive", true)
        )
        .collect();
    }

    return await ctx.db
      .query("webhooks")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Get single webhook
 */
export const getWebhook = query({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.webhookId);
  },
});

/**
 * Get webhook statistics
 */
export const getWebhookStats = query({
  args: {
    webhookId: v.id("webhooks"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) return null;

    const daysAgo = args.days || 7;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const deliveries = await ctx.db
      .query("webhook_deliveries")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", args.webhookId))
      .filter((q) => q.gte(q.field("triggeredAt"), cutoffDate))
      .collect();

    const total = deliveries.length;
    const success = deliveries.filter((d) => d.status === "success").length;
    const failed = deliveries.filter((d) => d.status === "failed").length;
    const pending = deliveries.filter((d) => d.status === "pending").length;

    // Calculate average response time
    const successfulDeliveries = deliveries.filter(
      (d) => d.status === "success" && d.response
    );
    const avgResponseTime =
      successfulDeliveries.length > 0
        ? successfulDeliveries.reduce(
            (sum, d) => sum + (d.response?.duration || 0),
            0
          ) / successfulDeliveries.length
        : 0;

    return {
      total,
      success,
      failed,
      pending,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgResponseTime,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create webhook
 */
export const createWebhook = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    isActive: v.boolean(),
    headers: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.string(),
        })
      )
    ),
    retryPolicy: v.optional(
      v.object({
        maxRetries: v.number(),
        retryDelay: v.number(),
        exponentialBackoff: v.boolean(),
      })
    ),
    timeout: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate webhook secret
    const secret = generateWebhookSecret();

    const now = Date.now();

    return await ctx.db.insert("webhooks", {
      orgId: args.orgId,
      name: args.name,
      url: args.url,
      secret,
      events: args.events as any,
      isActive: args.isActive,
      headers: args.headers,
      retryPolicy: args.retryPolicy || {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      },
      timeout: args.timeout || 30000,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
    });
  },
});

/**
 * Update webhook
 */
export const updateWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    headers: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.string(),
        })
      )
    ),
    retryPolicy: v.optional(
      v.object({
        maxRetries: v.number(),
        retryDelay: v.number(),
        exponentialBackoff: v.boolean(),
      })
    ),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { webhookId, ...updates } = args;

    await ctx.db.patch(webhookId, {
      ...updates,
      events: updates.events as any,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete webhook
 */
export const deleteWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.webhookId);
    return { success: true };
  },
});

/**
 * Toggle webhook status
 */
export const toggleWebhookStatus = mutation({
  args: {
    webhookId: v.id("webhooks"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Rotate webhook secret
 */
export const rotateWebhookSecret = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const newSecret = generateWebhookSecret();

    await ctx.db.patch(args.webhookId, {
      secret: newSecret,
      updatedAt: Date.now(),
    });

    return { secret: newSecret };
  },
});

/**
 * Test webhook
 */
export const testWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    // Create a test delivery
    const deliveryId = await ctx.db.insert("webhook_deliveries", {
      webhookId: args.webhookId,
      orgId: webhook.orgId,
      event: "test.event",
      payload: {
        test: true,
        timestamp: Date.now(),
        message: "This is a test webhook delivery",
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 1,
      triggeredAt: Date.now(),
      createdAt: Date.now(),
    });

    return { deliveryId, message: "Test webhook queued for delivery" };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Generate secure webhook secret
 */
function generateWebhookSecret(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let secret = "whsec_";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
