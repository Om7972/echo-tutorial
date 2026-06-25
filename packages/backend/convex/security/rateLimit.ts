// @ts-nocheck
/**
 * Rate Limiting System
 * Protect APIs from abuse
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Configuration ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  blockDurationMs: number; // How long to block after exceeding limit
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // API endpoints
  "api:default": { windowMs: 60000, maxRequests: 100, blockDurationMs: 300000 },
  "api:auth": { windowMs: 60000, maxRequests: 5, blockDurationMs: 600000 },
  "api:upload": { windowMs: 60000, maxRequests: 10, blockDurationMs: 300000 },
  "api:webhook": { windowMs: 60000, maxRequests: 10, blockDurationMs: 300000 },
  
  // User actions
  "user:message": { windowMs: 60000, maxRequests: 50, blockDurationMs: 180000 },
  "user:search": { windowMs: 60000, maxRequests: 30, blockDurationMs: 180000 },
  
  // Admin actions
  "admin:export": { windowMs: 3600000, maxRequests: 5, blockDurationMs: 3600000 },
};

// ─── Queries ────────────────────────────────────────────────────────────────

export const checkRateLimit = query({
  args: {
    identifier: v.string(), // IP, userId, or apiKey
    identifierType: v.union(v.literal("ip"), v.literal("user"), v.literal("api_key")),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const config = RATE_LIMITS[args.endpoint] || RATE_LIMITS["api:default"];
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Find existing rate limit record
    const existing = await ctx.db
      .query("rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", args.identifier).eq("endpoint", args.endpoint)
      )
      .first();

    if (!existing) {
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    // Check if blocked
    if (existing.isBlocked && existing.blockedUntil && existing.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.blockedUntil,
        blocked: true,
        retryAfter: Math.ceil((existing.blockedUntil - now) / 1000),
      };
    }

    // Check if window expired
    if (existing.windowStart < windowStart) {
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    if (existing.requests >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.windowStart + config.windowMs,
        limited: true,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - existing.requests - 1,
      resetAt: existing.windowStart + config.windowMs,
    };
  },
});

export const getRateLimitStats = query({
  args: {
    identifier: v.optional(v.string()),
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rate_limits");

    if (args.identifier) {
      q = q.withIndex("by_identifier", (q) => q.eq("identifier", args.identifier));
    }

    const limits = await q.collect();

    return {
      total: limits.length,
      blocked: limits.filter((l) => l.isBlocked).length,
      active: limits.filter((l) => !l.isBlocked).length,
      limits: limits.slice(0, 50),
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const recordRequest = mutation({
  args: {
    identifier: v.string(),
    identifierType: v.union(v.literal("ip"), v.literal("user"), v.literal("api_key")),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const config = RATE_LIMITS[args.endpoint] || RATE_LIMITS["api:default"];
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Find existing record
    const existing = await ctx.db
      .query("rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", args.identifier).eq("endpoint", args.endpoint)
      )
      .first();

    if (!existing) {
      // Create new record
      await ctx.db.insert("rate_limits", {
        identifier: args.identifier,
        identifierType: args.identifierType,
        endpoint: args.endpoint,
        requests: 1,
        windowStart: now,
        windowDuration: config.windowMs,
        isBlocked: false,
      });
      return { success: true, requests: 1 };
    }

    // Check if window expired - reset counter
    if (existing.windowStart < windowStart) {
      await ctx.db.patch(existing._id, {
        requests: 1,
        windowStart: now,
        isBlocked: false,
        blockedUntil: undefined,
      });
      return { success: true, requests: 1 };
    }

    // Increment counter
    const newRequests = existing.requests + 1;
    const shouldBlock = newRequests >= config.maxRequests;

    await ctx.db.patch(existing._id, {
      requests: newRequests,
      isBlocked: shouldBlock,
      blockedUntil: shouldBlock ? now + config.blockDurationMs : undefined,
    });

    // Log security event if blocked
    if (shouldBlock) {
      await ctx.db.insert("security_events", {
        eventType: "rate_limit_exceeded",
        severity: "medium",
        ipAddress: args.identifierType === "ip" ? args.identifier : "unknown",
        userId: args.identifierType === "user" ? args.identifier : undefined,
        endpoint: args.endpoint,
        isBlocked: true,
        blockDuration: config.blockDurationMs,
        detectionMethod: "rate_limiter",
        details: {
          requests: newRequests,
          limit: config.maxRequests,
          windowMs: config.windowMs,
        },
        timestamp: now,
      });
    }

    return {
      success: !shouldBlock,
      requests: newRequests,
      blocked: shouldBlock,
    };
  },
});

export const unblockIdentifier = mutation({
  args: {
    identifier: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", args.identifier).eq("endpoint", args.endpoint)
      )
      .first();

    if (!existing) {
      throw new Error("Rate limit record not found");
    }

    await ctx.db.patch(existing._id, {
      isBlocked: false,
      blockedUntil: undefined,
      requests: 0,
    });

    return { success: true };
  },
});

export const clearOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    const oldRecords = await ctx.db
      .query("rate_limits")
      .filter((q) => q.lt(q.field("windowStart"), cutoff))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Middleware-style rate limit check
 */
export async function enforceRateLimit(
  ctx: any,
  identifier: string,
  identifierType: "ip" | "user" | "api_key",
  endpoint: string
): Promise<{ allowed: boolean; error?: string }> {
  const check = await ctx.db
    .query("rate_limits")
    .withIndex("by_identifier_endpoint", (q: any) =>
      q.eq("identifier", identifier).eq("endpoint", endpoint)
    )
    .first();

  const config = RATE_LIMITS[endpoint] || RATE_LIMITS["api:default"];
  const now = Date.now();

  if (!check) return { allowed: true };

  // Check if blocked
  if (check.isBlocked && check.blockedUntil && check.blockedUntil > now) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Try again in ${Math.ceil((check.blockedUntil - now) / 1000)}s`,
    };
  }

  // Check if window expired
  if (check.windowStart < now - config.windowMs) {
    return { allowed: true };
  }

  // Check limit
  if (check.requests >= config.maxRequests) {
    return {
      allowed: false,
      error: "Rate limit exceeded. Please try again later.",
    };
  }

  return { allowed: true };
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetAt.toString(),
  };
}
