// @ts-nocheck
/**
 * Memory analytics and reporting
 * Provides insights into memory usage, costs, and performance
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get comprehensive memory analytics for an organization
 */
export const getMemoryAnalytics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()), // YYYY-MM-DD
    endDate: v.optional(v.string()),   // YYYY-MM-DD
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any> => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(30);

    const analytics = await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();

    // Aggregate statistics
    const totals = analytics.reduce(
      (acc, record) => {
        acc.totalMemories += record.totalMemories;
        acc.shortTermMemories += record.shortTermMemories;
        acc.longTermMemories += record.longTermMemories;
        acc.semanticMemories += record.semanticMemories;
        acc.totalTokens += record.totalTokens;
        acc.totalEmbeddings += record.totalEmbeddings;
        acc.summarizationsCompleted += record.summarizationsCompleted;
        acc.embeddingsGenerated += record.embeddingsGenerated;
        acc.memoriesExpired += record.memoriesExpired;
        acc.totalCostUSD += record.totalCostUSD;
        acc.summarizationCostUSD += record.summarizationCostUSD;
        acc.embeddingCostUSD += record.embeddingCostUSD;
        acc.totalRetrievals += record.totalRetrievals;
        return acc;
      },
      {
        totalMemories: 0,
        shortTermMemories: 0,
        longTermMemories: 0,
        semanticMemories: 0,
        totalTokens: 0,
        totalEmbeddings: 0,
        summarizationsCompleted: 0,
        embeddingsGenerated: 0,
        memoriesExpired: 0,
        totalCostUSD: 0,
        summarizationCostUSD: 0,
        embeddingCostUSD: 0,
        totalRetrievals: 0,
      }
    );

    // Calculate averages
    const avgRetrievalTimeMs = analytics.length > 0
      ? analytics.reduce((sum, r) => sum + r.avgRetrievalTimeMs, 0) / analytics.length
      : 0;

    const avgCostPerDay = analytics.length > 0
      ? totals.totalCostUSD / analytics.length
      : 0;

    return {
      dateRange: { startDate, endDate },
      totals,
      averages: {
        avgRetrievalTimeMs,
        avgCostPerDay,
        avgMemoriesPerDay: analytics.length > 0 ? totals.totalMemories / analytics.length : 0,
        avgTokensPerDay: analytics.length > 0 ? totals.totalTokens / analytics.length : 0,
      },
      dailyData: analytics,
    };
  },
});

/**
 * Get memory cost breakdown
 */
export const getCostBreakdown = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(30);

    const analytics = await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();

    const costData = analytics.map(record => ({
      date: record.date,
      totalCost: record.totalCostUSD,
      summarizationCost: record.summarizationCostUSD,
      embeddingCost: record.embeddingCostUSD,
    }));

    const totalCost = analytics.reduce((sum, r) => sum + r.totalCostUSD, 0);
    const summarizationCost = analytics.reduce((sum, r) => sum + r.summarizationCostUSD, 0);
    const embeddingCost = analytics.reduce((sum, r) => sum + r.embeddingCostUSD, 0);

    return {
      dateRange: { startDate, endDate },
      totalCost,
      breakdown: {
        summarization: {
          cost: summarizationCost,
          percentage: totalCost > 0 ? (summarizationCost / totalCost) * 100 : 0,
        },
        embeddings: {
          cost: embeddingCost,
          percentage: totalCost > 0 ? (embeddingCost / totalCost) * 100 : 0,
        },
      },
      dailyCosts: costData,
    };
  },
});

/**
 * Get memory usage trends
 */
export const getUsageTrends = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const startDate = getDateDaysAgo(days);
    const endDate = new Date().toISOString().split("T")[0];

    const analytics = await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();

    const trends = analytics.map(record => ({
      date: record.date,
      totalMemories: record.totalMemories,
      shortTerm: record.shortTermMemories,
      longTerm: record.longTermMemories,
      semantic: record.semanticMemories,
      tokens: record.totalTokens,
      embeddings: record.totalEmbeddings,
    }));

    // Calculate growth rate
    const firstRecord = analytics[0];
    const lastRecord = analytics[analytics.length - 1];
    
    const growthRate = firstRecord && lastRecord && firstRecord.totalMemories > 0
      ? ((lastRecord.totalMemories - firstRecord.totalMemories) / firstRecord.totalMemories) * 100
      : 0;

    return {
      dateRange: { startDate, endDate },
      trends,
      growthRate,
    };
  },
});

/**
 * Get retrieval performance metrics
 */
export const getRetrievalMetrics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || Date.now();
    const startDate = args.startDate || endDate - 30 * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("memory_retrieval_logs")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("timestamp"), startDate),
          q.lte(q.field("timestamp"), endDate)
        )
      )
      .collect();

    if (logs.length === 0) {
      return {
        totalRetrievals: 0,
        avgRetrievalTime: 0,
        totalTokensRetrieved: 0,
        strategyBreakdown: {},
        performanceByStrategy: {},
      };
    }

    // Calculate metrics
    const totalRetrievals = logs.length;
    const avgRetrievalTime = logs.reduce((sum, log) => sum + log.retrievalTimeMs, 0) / totalRetrievals;
    const totalTokensRetrieved = logs.reduce((sum, log) => sum + log.tokensRetrieved, 0);

    // Strategy breakdown
    const strategyBreakdown: Record<string, number> = {};
    const strategyTimes: Record<string, number[]> = {};

    for (const log of logs) {
      strategyBreakdown[log.strategy] = (strategyBreakdown[log.strategy] || 0) + 1;
      
      if (!strategyTimes[log.strategy]) {
        strategyTimes[log.strategy] = [];
      }
      strategyTimes[log.strategy].push(log.retrievalTimeMs);
    }

    // Performance by strategy
    const performanceByStrategy: Record<string, { count: number; avgTime: number }> = {};
    
    for (const [strategy, times] of Object.entries(strategyTimes)) {
      performanceByStrategy[strategy] = {
        count: times.length,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      };
    }

    return {
      dateRange: { startDate, endDate },
      totalRetrievals,
      avgRetrievalTime,
      totalTokensRetrieved,
      strategyBreakdown,
      performanceByStrategy,
    };
  },
});

/**
 * Get top accessed memories
 */
export const getTopMemories = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Sort by access count
    const sorted = memories
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return sorted.map(memory => ({
      id: memory._id,
      conversationId: memory.conversationId,
      type: memory.type,
      accessCount: memory.accessCount,
      lastAccessedAt: memory.lastAccessedAt,
      tokenCount: memory.tokenCount,
      preview: memory.content.substring(0, 100) + "...",
    }));
  },
});

/**
 * Get job statistics
 */
export const getJobStatistics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || Date.now();
    const startDate = args.startDate || endDate - 30 * 24 * 60 * 60 * 1000;

    const jobs = await ctx.db
      .query("memory_jobs")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("scheduledAt"), startDate),
          q.lte(q.field("scheduledAt"), endDate)
        )
      )
      .collect();

    const totalJobs = jobs.length;
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = jobs.reduce((acc, job) => {
      acc[job.jobType] = (acc[job.jobType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedJobs = jobs.filter(j => j.status === "completed");
    const avgCompletionTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) =>
          sum + ((j.completedAt || 0) - (j.startedAt || 0)), 0
        ) / completedJobs.length
      : 0;

    const totalCost = completedJobs.reduce((sum, j) => sum + (j.costUSD || 0), 0);
    const totalTokens = completedJobs.reduce((sum, j) => sum + (j.tokensUsed || 0), 0);

    return {
      dateRange: { startDate, endDate },
      totalJobs,
      statusCounts,
      typeCounts,
      avgCompletionTime,
      totalCost,
      totalTokens,
      successRate: totalJobs > 0 ? (statusCounts.completed || 0) / totalJobs * 100 : 0,
    };
  },
});

/**
 * Get memory health score
 */
export const getMemoryHealthScore = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.runQuery(internal.memory.manager.getMemoryStats, {
      orgId: args.orgId,
    });

    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Calculate health metrics
    let score = 100;
    const issues = [];

    // Check for old memories without embeddings
    const semanticCount = memories.filter(m => m.type === "semantic").length;
    const embeddingRatio = stats.total > 0 ? semanticCount / stats.total : 0;
    
    if (embeddingRatio < 0.3) {
      score -= 20;
      issues.push("Low embedding coverage - less than 30% of memories have embeddings");
    }

    // Check for stale memories (not accessed in 60 days)
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const staleMemories = memories.filter(m => m.lastAccessedAt < sixtyDaysAgo);
    const staleRatio = stats.total > 0 ? staleMemories.length / stats.total : 0;

    if (staleRatio > 0.5) {
      score -= 15;
      issues.push("High number of stale memories - over 50% not accessed in 60 days");
    }

    // Check short-term to long-term ratio
    const shortToLongRatio = stats.longTerm > 0 ? stats.shortTerm / stats.longTerm : stats.shortTerm;
    
    if (shortToLongRatio > 10) {
      score -= 15;
      issues.push("Too many short-term memories - consider consolidation");
    }

    // Check for failed jobs
    const recentJobs = await ctx.db
      .query("memory_jobs")
      .withIndex("by_org_status", q =>
        q.eq("orgId", args.orgId).eq("status", "failed")
      )
      .take(10)
      .collect();

    if (recentJobs.length > 5) {
      score -= 10;
      issues.push("Multiple recent job failures detected");
    }

    return {
      score: Math.max(0, score),
      grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F",
      issues,
      recommendations: generateRecommendations(issues),
    };
  },
});

// ─── Helper Functions ──────────────────────────────────────────────────────

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function generateRecommendations(issues: string[]): string[] {
  const recommendations = [];

  if (issues.some(i => i.includes("embedding"))) {
    recommendations.push("Schedule embedding generation jobs for memories without them");
  }

  if (issues.some(i => i.includes("stale"))) {
    recommendations.push("Consider expiring or archiving old unused memories");
    recommendations.push("Review memory expiration policies");
  }

  if (issues.some(i => i.includes("short-term"))) {
    recommendations.push("Schedule consolidation jobs to convert old short-term memories to long-term");
  }

  if (issues.some(i => i.includes("job failures"))) {
    recommendations.push("Review job logs and fix underlying issues");
    recommendations.push("Check API credentials and rate limits");
  }

  if (recommendations.length === 0) {
    recommendations.push("Memory system is healthy - continue monitoring");
  }

  return recommendations;
}

const internal = {
  memory: {
    manager: {
      getMemoryStats: null as any,
    },
  },
};
