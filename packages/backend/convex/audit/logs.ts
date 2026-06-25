// @ts-nocheck
/**
 * Audit System - Logs
 * Track all system activities for compliance and security
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get audit logs with filters
 */
export const getAuditLogs = query({
  args: {
    orgId: v.string(),
    userId: v.optional(v.string()),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("audit_logs")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .order("desc");

    let logs = await query.take(args.limit || 100);

    // Apply filters
    if (args.userId) {
      logs = logs.filter((log) => log.userId === args.userId);
    }

    if (args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }

    if (args.resource) {
      logs = logs.filter((log) => log.resource === args.resource);
    }

    if (args.dateFrom) {
      logs = logs.filter((log) => log.timestamp >= args.dateFrom!);
    }

    if (args.dateTo) {
      logs = logs.filter((log) => log.timestamp <= args.dateTo!);
    }

    return logs;
  },
});

/**
 * Get audit log by ID
 */
export const getAuditLog = query({
  args: {
    logId: v.id("audit_logs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.logId);
  },
});

/**
 * Get audit logs for specific resource
 */
export const getResourceAuditLogs = query({
  args: {
    orgId: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_resource", (q) =>
        q.eq("resource", args.resource).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(args.limit || 50);

    return logs.filter((log) => log.orgId === args.orgId);
  },
});

/**
 * Get audit statistics
 */
export const getAuditStats = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("timestamp"), cutoffDate))
      .collect();

    // Calculate statistics
    const total = logs.length;
    const byAction = logs.reduce((acc: any, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const byUser = logs.reduce((acc: any, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {});

    const failed = logs.filter((log) => !log.success).length;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;

    // Security events
    const securityEvents = logs.filter((log) =>
      ["login", "logout", "role_change", "api_key_create", "api_key_revoke"].includes(log.action)
    ).length;

    return {
      total,
      failed,
      successRate,
      securityEvents,
      byAction,
      byUser,
      topUsers: Object.entries(byUser)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count })),
    };
  },
});

/**
 * Search audit logs
 */
export const searchAuditLogs = query({
  args: {
    orgId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit || 100);

    const searchLower = args.searchTerm.toLowerCase();

    return logs.filter((log) => {
      const userName = log.userName?.toLowerCase() || "";
      const userEmail = log.userEmail?.toLowerCase() || "";
      const action = log.action.toLowerCase();
      const details = JSON.stringify(log.details).toLowerCase();

      return (
        userName.includes(searchLower) ||
        userEmail.includes(searchLower) ||
        action.includes(searchLower) ||
        details.includes(searchLower)
      );
    });
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Log an audit event
 */
export const logAudit = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    action: v.string(),
    resource: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    details: v.any(),
    changes: v.optional(v.object({
      before: v.any(),
      after: v.any(),
    })),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audit_logs", {
      ...args,
      action: args.action as any,
      timestamp: Date.now(),
      location: undefined, // Can be enriched with IP geolocation
    });
  },
});

/**
 * Export audit logs to CSV
 */
export const exportAuditLogs = query({
  args: {
    orgId: v.string(),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("audit_logs")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .order("desc");

    let logs = await query.collect();

    // Apply date filters
    if (args.dateFrom) {
      logs = logs.filter((log) => log.timestamp >= args.dateFrom!);
    }

    if (args.dateTo) {
      logs = logs.filter((log) => log.timestamp <= args.dateTo!);
    }

    return logs.map((log) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      userId: log.userId,
      userName: log.userName || "",
      userEmail: log.userEmail || "",
      action: log.action,
      resource: log.resource || "",
      resourceId: log.resourceId || "",
      success: log.success ? "Yes" : "No",
      ipAddress: log.ipAddress || "",
      details: JSON.stringify(log.details),
    }));
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

/**
 * Bulk delete old audit logs (for retention policy)
 */
export const deleteOldAuditLogs = internalMutation({
  args: {
    orgId: v.string(),
    olderThan: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    const oldLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.lt(q.field("timestamp"), args.olderThan))
      .collect();

    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted };
  },
});
