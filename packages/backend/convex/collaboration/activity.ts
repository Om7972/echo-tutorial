/**
 * Internal Collaboration - Activity Logs
 * Tracks all collaboration activities for audit trail
 */

import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Log activity (internal)
 */
export const logActivity = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    activityType: v.union(
      v.literal("note_created"),
      v.literal("note_updated"),
      v.literal("note_deleted"),
      v.literal("note_pinned"),
      v.literal("note_unpinned"),
      v.literal("user_mentioned"),
      v.literal("assignment_created"),
      v.literal("assignment_accepted"),
      v.literal("assignment_declined"),
      v.literal("assignment_completed"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("permission_changed")
    ),
    actorId: v.string(),
    actorName: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.object({})),
    changes: v.optional(v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      fields: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("collaboration_activity", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      activityType: args.activityType,
      actorId: args.actorId,
      actorName: args.actorName,
      targetType: args.targetType,
      targetId: args.targetId,
      description: args.description,
      metadata: args.metadata,
      changes: args.changes,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get activity log
 */
export const getActivityLog = query({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    actorId: v.optional(v.string()),
    activityType: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("collaboration_activity")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    // Filter by conversation
    if (args.conversationId) {
      activities = activities.filter(a => a.conversationId === args.conversationId);
    }

    // Filter by actor
    if (args.actorId) {
      activities = activities.filter(a => a.actorId === args.actorId);
    }

    // Filter by activity type
    if (args.activityType && args.activityType.length > 0) {
      activities = activities.filter(a => args.activityType!.includes(a.activityType));
    }

    // Filter by date range
    if (args.startDate) {
      activities = activities.filter(a => a.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      activities = activities.filter(a => a.timestamp <= args.endDate!);
    }

    const limit = args.limit || 100;
    return activities.slice(0, limit);
  },
});

/**
 * Get activity statistics
 */
export const getActivityStats = query({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    let activities = await ctx.db
      .query("collaboration_activity")
      .withIndex("by_org_timestamp", q => q.eq("orgId", args.orgId))
      .filter(q => q.gte(q.field("timestamp"), cutoffDate))
      .collect();

    if (args.conversationId) {
      activities = activities.filter(a => a.conversationId === args.conversationId);
    }

    // Count by type
    const byType: Record<string, number> = {};
    activities.forEach(a => {
      byType[a.activityType] = (byType[a.activityType] || 0) + 1;
    });

    // Count by actor
    const byActor: Record<string, number> = {};
    activities.forEach(a => {
      byActor[a.actorId] = (byActor[a.actorId] || 0) + 1;
    });

    // Count by day
    const byDay: Record<string, number> = {};
    activities.forEach(a => {
      const date = new Date(a.timestamp).toISOString().split("T")[0]!;
      byDay[date] = (byDay[date] || 0) + 1;
    });

    return {
      total: activities.length,
      byType,
      byActor,
      byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    };
  },
});

/**
 * Get recent activity for a user
 */
export const getUserRecentActivity = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("collaboration_activity")
      .withIndex("by_actor_id", q => q.eq("actorId", args.userId))
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .order("desc")
      .collect();

    const limit = args.limit || 20;
    return activities.slice(0, limit);
  },
});
