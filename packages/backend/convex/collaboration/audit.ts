/**
 * Internal Collaboration - Audit Trail
 * Comprehensive audit logging for compliance and security
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create audit log entry (internal)
 */
export const createAuditLog = internalMutation({
  args: {
    orgId: v.string(),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    actorId: v.string(),
    actorName: v.string(),
    actorIp: v.optional(v.string()),
    actorUserAgent: v.optional(v.string()),
    description: v.string(),
    changes: v.optional(v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
    })),
    conversationId: v.optional(v.id("unified_conversations")),
    sessionId: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("collaboration_audit", {
      orgId: args.orgId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      actorId: args.actorId,
      actorName: args.actorName,
      actorIp: args.actorIp,
      actorUserAgent: args.actorUserAgent,
      description: args.description,
      changes: args.changes,
      conversationId: args.conversationId,
      sessionId: args.sessionId,
      success: args.success,
      errorMessage: args.errorMessage,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get audit logs
 */
export const getAuditLogs = query({
  args: {
    orgId: v.string(),
    actorId: v.optional(v.string()),
    action: v.optional(v.array(v.string())),
    resourceType: v.optional(v.array(v.string())),
    resourceId: v.optional(v.string()),
    conversationId: v.optional(v.id("unified_conversations")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    success: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    // Apply filters
    if (args.actorId) {
      logs = logs.filter(l => l.actorId === args.actorId);
    }

    if (args.action && args.action.length > 0) {
      logs = logs.filter(l => args.action!.includes(l.action));
    }

    if (args.resourceType && args.resourceType.length > 0) {
      logs = logs.filter(l => args.resourceType!.includes(l.resourceType));
    }

    if (args.resourceId) {
      logs = logs.filter(l => l.resourceId === args.resourceId);
    }

    if (args.conversationId) {
      logs = logs.filter(l => l.conversationId === args.conversationId);
    }

    if (args.startDate) {
      logs = logs.filter(l => l.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter(l => l.timestamp <= args.endDate!);
    }

    if (args.success !== undefined) {
      logs = logs.filter(l => l.success === args.success);
    }

    const limit = args.limit || 100;
    return logs.slice(0, limit);
  },
});

/**
 * Get audit logs for a resource
 */
export const getResourceAuditLogs = query({
  args: {
    orgId: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_resource", q =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .order("desc")
      .collect();

    const limit = args.limit || 50;
    return logs.slice(0, limit);
  },
});

/**
 * Get audit statistics
 */
export const getAuditStats = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .collect();

    // Apply date filters
    if (args.startDate) {
      logs = logs.filter(l => l.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter(l => l.timestamp <= args.endDate!);
    }

    // Count by action
    const byAction: Record<string, number> = {};
    logs.forEach(l => {
      byAction[l.action] = (byAction[l.action] || 0) + 1;
    });

    // Count by resource type
    const byResourceType: Record<string, number> = {};
    logs.forEach(l => {
      byResourceType[l.resourceType] = (byResourceType[l.resourceType] || 0) + 1;
    });

    // Count by actor
    const byActor: Record<string, number> = {};
    logs.forEach(l => {
      byActor[l.actorId] = (byActor[l.actorId] || 0) + 1;
    });

    // Count by day
    const byDay: Record<string, number> = {};
    logs.forEach(l => {
      const date = new Date(l.timestamp).toISOString().split("T")[0]!;
      byDay[date] = (byDay[date] || 0) + 1;
    });

    const successCount = logs.filter(l => l.success).length;
    const failureCount = logs.filter(l => !l.success).length;

    return {
      total: logs.length,
      successCount,
      failureCount,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      byAction,
      byResourceType,
      byActor,
      byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    };
  },
});

/**
 * Get user audit history
 */
export const getUserAuditHistory = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_actor_id", q => q.eq("actorId", args.userId))
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .order("desc")
      .collect();

    const limit = args.limit || 100;
    return logs.slice(0, limit);
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
      .query("collaboration_audit")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    const filtered = logs.filter(l =>
      l.description.toLowerCase().includes(searchLower) ||
      l.actorName.toLowerCase().includes(searchLower) ||
      l.resourceId.toLowerCase().includes(searchLower)
    );

    const limit = args.limit || 50;
    return filtered.slice(0, limit);
  },
});

/**
 * Export audit logs
 */
export const exportAuditLogs = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    format: v.optional(v.union(v.literal("json"), v.literal("csv"))),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    // Apply date filters
    if (args.startDate) {
      logs = logs.filter(l => l.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter(l => l.timestamp <= args.endDate!);
    }

    const format = args.format || "json";

    if (format === "csv") {
      const headers = [
        "Timestamp",
        "Action",
        "Resource Type",
        "Resource ID",
        "Actor",
        "Description",
        "Success",
        "IP Address",
      ];

      const rows = logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.action,
        l.resourceType,
        l.resourceId,
        l.actorName,
        l.description,
        l.success ? "Yes" : "No",
        l.actorIp || "N/A",
      ]);

      return {
        format: "csv",
        data: [headers, ...rows],
      };
    }

    return {
      format: "json",
      data: logs.map(l => ({
        timestamp: l.timestamp,
        date: new Date(l.timestamp).toISOString(),
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        actorId: l.actorId,
        actorName: l.actorName,
        actorIp: l.actorIp,
        description: l.description,
        success: l.success,
        errorMessage: l.errorMessage,
        changes: l.changes,
      })),
    };
  },
});

/**
 * Get failed actions
 */
export const getFailedActions = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("collaboration_audit")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .filter(q => q.eq(q.field("success"), false))
      .order("desc")
      .collect();

    const limit = args.limit || 50;
    return logs.slice(0, limit);
  },
});
