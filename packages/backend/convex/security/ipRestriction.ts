// @ts-nocheck
/**
 * IP Restriction System
 * Manage whitelist and blacklist
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

export const checkIpAllowed = query({
  args: {
    orgId: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check blacklist first
    const blacklisted = await ctx.db
      .query("ip_restrictions")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "blacklist"),
          q.or(
            q.eq(q.field("expiresAt"), undefined),
            q.gt(q.field("expiresAt"), now)
          )
        )
      )
      .first();

    if (blacklisted) {
      return {
        allowed: false,
        reason: "IP address is blacklisted",
        restriction: blacklisted,
      };
    }

    // Check if whitelist is active for org
    const whitelistEntries = await ctx.db
      .query("ip_restrictions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("type"), "whitelist"))
      .collect();

    // If whitelist exists, IP must be on it
    if (whitelistEntries.length > 0) {
      const whitelisted = whitelistEntries.find((entry) => {
        if (entry.expiresAt && entry.expiresAt < now) return false;
        return matchesIpPattern(args.ipAddress, entry.ipAddress);
      });

      if (!whitelisted) {
        return {
          allowed: false,
          reason: "IP address not whitelisted",
        };
      }
    }

    return { allowed: true };
  },
});

export const getIpRestrictions = query({
  args: {
    orgId: v.string(),
    type: v.optional(v.union(v.literal("whitelist"), v.literal("blacklist"))),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("ip_restrictions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

    const restrictions = await q.collect();

    if (args.type) {
      return restrictions.filter((r) => r.type === args.type);
    }

    return {
      whitelist: restrictions.filter((r) => r.type === "whitelist"),
      blacklist: restrictions.filter((r) => r.type === "blacklist"),
    };
  },
});

export const getIpHistory = query({
  args: {
    ipAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("security_events")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .order("desc")
      .take(args.limit || 50);

    return events;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const addIpRestriction = mutation({
  args: {
    orgId: v.string(),
    ipAddress: v.string(),
    type: v.union(v.literal("whitelist"), v.literal("blacklist")),
    reason: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate IP address format
    if (!isValidIpAddress(args.ipAddress)) {
      throw new Error("Invalid IP address format");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("ip_restrictions")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .filter((q) =>
        q.and(q.eq(q.field("orgId"), args.orgId), q.eq(q.field("type"), args.type))
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        expiresAt: args.expiresAt,
      });
      return { id: existing._id, updated: true };
    }

    // Create new
    const id = await ctx.db.insert("ip_restrictions", {
      orgId: args.orgId,
      ipAddress: args.ipAddress,
      type: args.type,
      reason: args.reason,
      expiresAt: args.expiresAt,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_events", {
      orgId: args.orgId,
      eventType: args.type === "blacklist" ? "suspicious_ip" : "unauthorized_access",
      severity: args.type === "blacklist" ? "high" : "medium",
      ipAddress: args.ipAddress,
      endpoint: "/admin/ip-restrictions",
      isBlocked: args.type === "blacklist",
      detectionMethod: "manual",
      details: {
        action: "ip_restriction_added",
        type: args.type,
        reason: args.reason,
        addedBy: args.createdBy,
      },
      timestamp: Date.now(),
    });

    return { id, updated: false };
  },
});

export const removeIpRestriction = mutation({
  args: {
    restrictionId: v.id("ip_restrictions"),
  },
  handler: async (ctx, args) => {
    const restriction = await ctx.db.get(args.restrictionId);
    if (!restriction) {
      throw new Error("Restriction not found");
    }

    await ctx.db.delete(args.restrictionId);

    // Log removal
    await ctx.db.insert("security_events", {
      orgId: restriction.orgId,
      eventType: "unauthorized_access",
      severity: "low",
      ipAddress: restriction.ipAddress,
      endpoint: "/admin/ip-restrictions",
      isBlocked: false,
      detectionMethod: "manual",
      details: {
        action: "ip_restriction_removed",
        type: restriction.type,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const cleanupExpiredRestrictions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("ip_restrictions")
      .filter((q) =>
        q.and(q.neq(q.field("expiresAt"), undefined), q.lt(q.field("expiresAt"), now))
      )
      .collect();

    for (const restriction of expired) {
      await ctx.db.delete(restriction._id);
    }

    return { cleaned: expired.length };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Validate IP address format
 */
function isValidIpAddress(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv4 with CIDR
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (cidrRegex.test(ip)) {
    const [ipPart, cidr] = ip.split("/");
    const cidrNum = parseInt(cidr, 10);
    if (cidrNum < 0 || cidrNum > 32) return false;
    return isValidIpAddress(ipPart);
  }

  // IPv6 (basic check)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) return true;

  // Wildcard pattern
  if (ip.includes("*")) {
    const withoutWildcard = ip.replace(/\*/g, "0");
    return isValidIpAddress(withoutWildcard);
  }

  return false;
}

/**
 * Check if IP matches pattern (supports wildcards and CIDR)
 */
function matchesIpPattern(ip: string, pattern: string): boolean {
  // Exact match
  if (ip === pattern) return true;

  // Wildcard match
  if (pattern.includes("*")) {
    const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "\\d+") + "$");
    return regex.test(ip);
  }

  // CIDR match
  if (pattern.includes("/")) {
    return ipInCidr(ip, pattern);
  }

  return false;
}

/**
 * Check if IP is in CIDR range
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const mask = -1 << (32 - parseInt(bits, 10));

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP to number
 */
function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

/**
 * Get location from IP (placeholder - integrate with IP geolocation service)
 */
export async function getIpLocation(ipAddress: string): Promise<{
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
} | null> {
  // TODO: Integrate with IP geolocation service like:
  // - ipapi.co
  // - ip-api.com
  // - MaxMind GeoIP2
  
  // For now, return null
  return null;
}
