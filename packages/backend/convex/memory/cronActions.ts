/**
 * Cron action implementations for memory management
 */

import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Expire old memories for all organizations
 */
export const expireOldMemoriesAllOrgs = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all organizations with memories
    const orgs = await ctx.runQuery(internal.memory.cronActions.getAllOrgsWithMemories);

    let totalExpired = 0;

    for (const orgId of orgs) {
      try {
        // Expire memories older than 90 days
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        
        const result = await ctx.runMutation(internal.memory.manager.expireMemories, {
          orgId,
          beforeTimestamp: ninetyDaysAgo,
        });

        totalExpired += result.deletedCount;
      } catch (error) {
        console.error(`Error expiring memories for org ${orgId}:`, error);
      }
    }

    return { totalExpired };
  },
});

/**
 * Consolidate memories for all organizations
 */
export const consolidateMemoriesAllOrgs = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.memory.cronActions.getAllOrgsWithMemories);

    let totalConsolidated = 0;

    for (const orgId of orgs) {
      try {
        // Get conversations needing consolidation
        const conversations = await ctx.runQuery(
          internal.memory.cronActions.getConversationsNeedingConsolidation,
          { orgId }
        );

        for (const conversationId of conversations) {
          // Schedule consolidation job
          await ctx.runMutation(internal.memory.jobs.scheduleJob, {
            orgId,
            conversationId,
            jobType: "consolidate",
            priority: "low",
          });
          totalConsolidated++;
        }
      } catch (error) {
        console.error(`Error consolidating memories for org ${orgId}:`, error);
      }
    }

    return { jobsScheduled: totalConsolidated };
  },
});

/**
 * Decay relevance scores for all organizations
 */
export const decayRelevanceScoresAllOrgs = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.memory.cronActions.getAllOrgsWithMemories);

    let totalUpdated = 0;

    for (const orgId of orgs) {
      try {
        // Apply 5% daily decay
        const result = await ctx.runMutation(internal.memory.manager.updateRelevanceScores, {
          orgId,
          decayFactor: 0.95,
        });

        totalUpdated += result.updatedCount;
      } catch (error) {
        console.error(`Error decaying relevance scores for org ${orgId}:`, error);
      }
    }

    return { totalUpdated };
  },
});

/**
 * Generate embeddings for memories without them
 */
export const generateMissingEmbeddings = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.memory.cronActions.getAllOrgsWithMemories);

    let totalScheduled = 0;

    for (const orgId of orgs) {
      try {
        // Check if there are memories without embeddings
        const count = await ctx.runQuery(
          internal.memory.cronActions.countMemoriesWithoutEmbeddings,
          { orgId }
        );

        if (count > 0) {
          // Schedule embedding generation job
          await ctx.runMutation(internal.memory.jobs.scheduleJob, {
            orgId,
            jobType: "generate_embeddings",
            priority: "medium",
          });
          totalScheduled++;
        }
      } catch (error) {
        console.error(`Error scheduling embeddings for org ${orgId}:`, error);
      }
    }

    return { jobsScheduled: totalScheduled };
  },
});

/**
 * Update daily analytics for all organizations
 */
export const updateDailyAnalytics = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.memory.cronActions.getAllOrgsWithMemories);

    for (const orgId of orgs) {
      try {
        const stats = await ctx.runQuery(internal.memory.manager.getMemoryStats, {
          orgId,
        });

        const today = new Date().toISOString().split("T")[0];

        // Check if record exists
        const existing = await ctx.runQuery(
          internal.memory.cronActions.getAnalyticsForDate,
          { orgId, date: today }
        );

        if (existing) {
          await ctx.runMutation(internal.memory.cronActions.updateAnalytics, {
            analyticsId: existing._id,
            stats,
          });
        } else {
          await ctx.runMutation(internal.memory.cronActions.createAnalytics, {
            orgId,
            date: today,
            stats,
          });
        }
      } catch (error) {
        console.error(`Error updating analytics for org ${orgId}:`, error);
      }
    }

    return { success: true };
  },
});

/**
 * Clean up old completed jobs
 */
export const cleanupOldJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    // Delete jobs older than 30 days that are completed or failed
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const deletedCount = await ctx.runMutation(
      internal.memory.cronActions.deleteOldJobs,
      { beforeTimestamp: thirtyDaysAgo }
    );

    return { deletedCount };
  },
});

// ─── Internal Queries ──────────────────────────────────────────────────────

export const getAllOrgsWithMemories = internalQuery({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query("conversation_memories").collect();
    const orgIds = [...new Set(memories.map(m => m.orgId))];
    return orgIds;
  },
});

export const getConversationsNeedingConsolidation = internalQuery({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find conversations with many old short-term memories
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_type", q =>
        q.eq("orgId", args.orgId).eq("type", "short_term")
      )
      .filter(q => q.lt(q.field("createdAt"), sevenDaysAgo))
      .collect();

    // Group by conversation and count
    const conversationCounts = memories.reduce((acc, memory) => {
      const id = memory.conversationId;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return conversations with 10+ old memories
    return Object.entries(conversationCounts)
      .filter(([_, count]) => count >= 10)
      .map(([id]) => id as any);
  },
});

export const countMemoriesWithoutEmbeddings = internalQuery({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    let countWithoutEmbeddings = 0;

    for (const memory of memories) {
      const embeddings = await ctx.db
        .query("memory_embeddings")
        .withIndex("by_memory_id", q => q.eq("memoryId", memory._id))
        .first();

      if (!embeddings) {
        countWithoutEmbeddings++;
      }
    }

    return countWithoutEmbeddings;
  },
});

export const getAnalyticsForDate = internalQuery({
  args: {
    orgId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", args.date)
      )
      .first();
  },
});

export const updateAnalytics = internalAction({
  args: {
    analyticsId: v.id("memory_analytics"),
    stats: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.memory.cronActions.patchAnalytics, {
      analyticsId: args.analyticsId,
      stats: args.stats,
    });
  },
});

export const patchAnalytics = internalAction({
  args: {
    analyticsId: v.id("memory_analytics"),
    stats: v.any(),
  },
  handler: async (ctx, args) => {
    // Implementation would patch analytics
  },
});

export const createAnalytics = internalAction({
  args: {
    orgId: v.string(),
    date: v.string(),
    stats: v.any(),
  },
  handler: async (ctx, args) => {
    // Implementation would create analytics
  },
});

export const deleteOldJobs = internalAction({
  args: {
    beforeTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation would delete old jobs
    return 0;
  },
});
