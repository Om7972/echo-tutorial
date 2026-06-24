/**
 * Enterprise Analytics
 * Calculate and retrieve enterprise-level metrics
 */

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get enterprise analytics for a date range
 */
export const getEnterpriseAnalytics = query({
  args: {
    orgId: v.string(),
    dateFrom: v.string(), // YYYY-MM-DD
    dateTo: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("enterprise_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.dateFrom),
          q.lte(q.field("date"), args.dateTo)
        )
      )
      .collect();

    return analytics.sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Get metrics for specific type
 */
export const getMetricsByType = query({
  args: {
    orgId: v.string(),
    metricType: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("analytics_metrics")
      .withIndex("by_org_type_date", (q) =>
        q.eq("orgId", args.orgId).eq("metricType", args.metricType as any)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.dateFrom),
          q.lte(q.field("date"), args.dateTo)
        )
      )
      .collect();

    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  },
});

/**
 * Get aggregated summary
 */
export const getAnalyticsSummary = query({
  args: {
    orgId: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("enterprise_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.dateFrom),
          q.lte(q.field("date"), args.dateTo)
        )
      )
      .collect();

    if (analytics.length === 0) {
      return null;
    }

    // Calculate aggregates
    const summary = {
      avgResponseTimeMs: 0,
      avgFirstResponseTimeMs: 0,
      avgResolutionTimeMs: 0,
      totalConversations: 0,
      newConversations: 0,
      resolvedConversations: 0,
      aiAccuracyRate: 0,
      humanHandoffRate: 0,
      avgCsatScore: 0,
      avgSentimentScore: 0,
      totalCostUSD: 0,
      totalRevenue: 0,
      channelBreakdown: {
        email: 0,
        chat: 0,
        phone: 0,
        social: 0,
        other: 0,
      },
      priorityBreakdown: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
    };

    // Sum up values
    analytics.forEach((day) => {
      summary.avgResponseTimeMs += day.avgResponseTimeMs;
      summary.avgFirstResponseTimeMs += day.avgFirstResponseTimeMs;
      summary.avgResolutionTimeMs += day.avgResolutionTimeMs;
      summary.totalConversations += day.totalConversations;
      summary.newConversations += day.newConversations;
      summary.resolvedConversations += day.resolvedConversations;
      summary.aiAccuracyRate += day.aiAccuracyRate;
      summary.humanHandoffRate += day.humanHandoffRate;
      summary.avgCsatScore += day.avgCsatScore;
      summary.avgSentimentScore += day.avgSentimentScore;
      summary.totalCostUSD += day.totalCostUSD;
      summary.totalRevenue += day.totalRevenue || 0;

      // Channel breakdown
      summary.channelBreakdown.email += day.channelBreakdown.email;
      summary.channelBreakdown.chat += day.channelBreakdown.chat;
      summary.channelBreakdown.phone += day.channelBreakdown.phone;
      summary.channelBreakdown.social += day.channelBreakdown.social;
      summary.channelBreakdown.other += day.channelBreakdown.other;

      // Priority breakdown
      summary.priorityBreakdown.low += day.priorityBreakdown.low;
      summary.priorityBreakdown.medium += day.priorityBreakdown.medium;
      summary.priorityBreakdown.high += day.priorityBreakdown.high;
      summary.priorityBreakdown.urgent += day.priorityBreakdown.urgent;
    });

    // Calculate averages
    const count = analytics.length;
    summary.avgResponseTimeMs = summary.avgResponseTimeMs / count;
    summary.avgFirstResponseTimeMs = summary.avgFirstResponseTimeMs / count;
    summary.avgResolutionTimeMs = summary.avgResolutionTimeMs / count;
    summary.aiAccuracyRate = summary.aiAccuracyRate / count;
    summary.humanHandoffRate = summary.humanHandoffRate / count;
    summary.avgCsatScore = summary.avgCsatScore / count;
    summary.avgSentimentScore = summary.avgSentimentScore / count;

    return summary;
  },
});

/**
 * Compare two periods
 */
export const comparePeriods = query({
  args: {
    orgId: v.string(),
    period1From: v.string(),
    period1To: v.string(),
    period2From: v.string(),
    period2To: v.string(),
  },
  handler: async (ctx, args) => {
    const period1 = await ctx.db
      .query("enterprise_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.period1From),
          q.lte(q.field("date"), args.period1To)
        )
      )
      .collect();

    const period2 = await ctx.db
      .query("enterprise_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.period2From),
          q.lte(q.field("date"), args.period2To)
        )
      )
      .collect();

    const calculateAverage = (data: any[], field: string) => {
      if (data.length === 0) return 0;
      return data.reduce((sum, d) => sum + (d[field] || 0), 0) / data.length;
    };

    const calculateSum = (data: any[], field: string) => {
      return data.reduce((sum, d) => sum + (d[field] || 0), 0);
    };

    const comparison = {
      period1: {
        avgResponseTimeMs: calculateAverage(period1, "avgResponseTimeMs"),
        totalConversations: calculateSum(period1, "totalConversations"),
        aiAccuracyRate: calculateAverage(period1, "aiAccuracyRate"),
        humanHandoffRate: calculateAverage(period1, "humanHandoffRate"),
        avgCsatScore: calculateAverage(period1, "avgCsatScore"),
        totalCostUSD: calculateSum(period1, "totalCostUSD"),
      },
      period2: {
        avgResponseTimeMs: calculateAverage(period2, "avgResponseTimeMs"),
        totalConversations: calculateSum(period2, "totalConversations"),
        aiAccuracyRate: calculateAverage(period2, "aiAccuracyRate"),
        humanHandoffRate: calculateAverage(period2, "humanHandoffRate"),
        avgCsatScore: calculateAverage(period2, "avgCsatScore"),
        totalCostUSD: calculateSum(period2, "totalCostUSD"),
      },
      changes: {} as any,
    };

    // Calculate percentage changes
    const fields = Object.keys(comparison.period1);
    fields.forEach((field) => {
      const p1 = (comparison.period1 as any)[field];
      const p2 = (comparison.period2 as any)[field];

      if (p2 === 0) {
        comparison.changes[field] = { value: 0, percentage: 0 };
      } else {
        const change = p1 - p2;
        const percentage = (change / p2) * 100;
        comparison.changes[field] = {
          value: change,
          percentage: Math.round(percentage * 10) / 10,
        };
      }
    });

    return comparison;
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

/**
 * Generate daily analytics (to be called by cron)
 */
export const generateDailyAnalytics = internalMutation({
  args: {
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Get all conversations for the day
    const conversations = await ctx.db
      .query("unified_conversations")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startedAt"), startOfDay),
          q.lt(q.field("startedAt"), endOfDay)
        )
      )
      .collect();

    if (conversations.length === 0) {
      return null; // No data for this day
    }

    // Calculate response times
    const responseTimes = conversations
      .filter((c) => c.firstResponseTimeMs)
      .map((c) => c.firstResponseTimeMs!);

    const resolutionTimes = conversations
      .filter((c) => c.resolutionTimeMs)
      .map((c) => c.resolutionTimeMs!);

    const avgFirstResponseTimeMs =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    const avgResolutionTimeMs =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
        : 0;

    // Calculate volume metrics
    const totalConversations = conversations.length;
    const newConversations = totalConversations; // All conversations in this query are new
    const resolvedConversations = conversations.filter(
      (c) => c.status === "resolved" || c.status === "closed"
    ).length;
    const openConversations = totalConversations - resolvedConversations;

    // Calculate AI metrics
    const aiHandledConversations = conversations.filter((c) => c.isResolvedByAI).length;
    const aiAccuracyRate = totalConversations > 0 ? (aiHandledConversations / totalConversations) * 100 : 0;
    const humanHandoffCount = totalConversations - aiHandledConversations;
    const humanHandoffRate = totalConversations > 0 ? (humanHandoffCount / totalConversations) * 100 : 0;

    // Get unique active agents
    const activeAgents = new Set(
      conversations.filter((c) => c.assignedTo).map((c) => c.assignedTo!)
    ).size;

    const avgConversationsPerAgent = activeAgents > 0 ? totalConversations / activeAgents : 0;

    // Calculate CSAT
    const csatRatings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("ratedAt"), startOfDay),
          q.lt(q.field("ratedAt"), endOfDay)
        )
      )
      .collect();

    const avgCsatScore =
      csatRatings.length > 0
        ? csatRatings.reduce((sum, r) => sum + r.score, 0) / csatRatings.length
        : 0;

    // Calculate sentiment
    const sentimentAnalyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("analyzedAt"), startOfDay),
          q.lt(q.field("analyzedAt"), endOfDay)
        )
      )
      .collect();

    const avgSentimentScore =
      sentimentAnalyses.length > 0
        ? sentimentAnalyses.reduce((sum, s) => sum + s.sentimentScore, 0) /
          sentimentAnalyses.length
        : 0;

    const positiveCount = sentimentAnalyses.filter((s) =>
      ["positive", "satisfied"].includes(s.sentiment)
    ).length;
    const negativeCount = sentimentAnalyses.filter((s) =>
      ["negative", "angry", "frustrated"].includes(s.sentiment)
    ).length;
    const neutralCount = sentimentAnalyses.filter((s) => s.sentiment === "neutral").length;

    // Calculate costs
    const totalTokensUsed = conversations.reduce((sum, c) => sum + (c.tokensUsed || 0), 0);
    const totalCostUSD = conversations.reduce((sum, c) => sum + (c.costUSD || 0), 0);
    const avgCostPerConversation = totalConversations > 0 ? totalCostUSD / totalConversations : 0;

    // Channel breakdown
    const channelBreakdown = {
      email: conversations.filter((c) => c.channelType === "email").length,
      chat: conversations.filter((c) =>
        ["website_widget", "whatsapp", "telegram"].includes(c.channelType)
      ).length,
      phone: 0, // Add when phone channel is implemented
      social: conversations.filter((c) =>
        ["instagram", "facebook_messenger"].includes(c.channelType)
      ).length,
      other: conversations.filter(
        (c) =>
          !["email", "website_widget", "whatsapp", "telegram", "instagram", "facebook_messenger"].includes(
            c.channelType
          )
      ).length,
    };

    // Priority breakdown
    const priorityBreakdown = {
      low: conversations.filter((c) => c.priority === "low").length,
      medium: conversations.filter((c) => c.priority === "medium").length,
      high: conversations.filter((c) => c.priority === "high").length,
      urgent: conversations.filter((c) => c.priority === "urgent").length,
    };

    // Check if record exists
    const existing = await ctx.db
      .query("enterprise_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date))
      .first();

    const now = Date.now();

    const analyticsData = {
      orgId: args.orgId,
      date: args.date,
      avgResponseTimeMs: avgFirstResponseTimeMs,
      avgFirstResponseTimeMs,
      avgResolutionTimeMs,
      totalConversations,
      newConversations,
      resolvedConversations,
      openConversations,
      aiHandledConversations,
      aiAccuracyRate,
      humanHandoffRate,
      humanHandoffCount,
      activeAgents,
      avgConversationsPerAgent,
      avgCsatScore,
      totalCsatRatings: csatRatings.length,
      avgSentimentScore,
      positiveCount,
      negativeCount,
      neutralCount,
      totalTokensUsed,
      totalCostUSD,
      avgCostPerConversation,
      channelBreakdown,
      priorityBreakdown,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, analyticsData);
      return existing._id;
    } else {
      return await ctx.db.insert("enterprise_analytics", {
        ...analyticsData,
        createdAt: now,
      });
    }
  },
});

/**
 * Record a metric
 */
export const recordMetric = internalMutation({
  args: {
    orgId: v.string(),
    metricType: v.string(),
    value: v.number(),
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    agentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date(now).toISOString().split("T")[0]!;

    return await ctx.db.insert("analytics_metrics", {
      orgId: args.orgId,
      metricType: args.metricType as any,
      value: args.value,
      conversationId: args.conversationId,
      customerId: args.customerId,
      agentId: args.agentId,
      metadata: args.metadata,
      timestamp: now,
      date,
    });
  },
});
