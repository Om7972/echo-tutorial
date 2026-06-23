/**
 * Sentiment Analytics & Dashboard
 * Comprehensive analytics for sentiment and intent data
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Get comprehensive sentiment analytics
 */
export const getSentimentAnalytics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(30);

    // Get all analyses in date range
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

    const analyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("analyzedAt"), startTimestamp),
          q.lte(q.field("analyzedAt"), endTimestamp)
        )
      )
      .collect();

    // Calculate metrics
    const totalMessages = analyses.length;
    
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      angry: 0,
      urgent: 0,
      confused: 0,
      frustrated: 0,
      satisfied: 0,
    };

    const intentCounts = {
      refund: 0,
      pricing: 0,
      technical_issue: 0,
      feature_request: 0,
      complaint: 0,
      general_inquiry: 0,
      feedback: 0,
      cancel_subscription: 0,
      billing_issue: 0,
      account_issue: 0,
    };

    let totalSentimentScore = 0;
    let totalConfidence = 0;
    let handoffCount = 0;
    let priorityIncreaseCount = 0;
    let vipRoutingCount = 0;
    let totalCost = 0;

    for (const analysis of analyses) {
      sentimentCounts[analysis.sentiment as keyof typeof sentimentCounts]++;
      intentCounts[analysis.intent as keyof typeof intentCounts]++;
      totalSentimentScore += analysis.sentimentScore;
      totalConfidence += analysis.sentimentConfidence;
      totalCost += analysis.costUSD;

      if (analysis.triggeredHandoff) handoffCount++;
      if (analysis.triggeredPriorityIncrease) priorityIncreaseCount++;
      if (analysis.triggeredVIPRouting) vipRoutingCount++;
    }

    return {
      dateRange: { startDate, endDate },
      totalMessages,
      sentimentDistribution: sentimentCounts,
      intentDistribution: intentCounts,
      avgSentimentScore: totalMessages > 0 ? totalSentimentScore / totalMessages : 0,
      avgConfidence: totalMessages > 0 ? totalConfidence / totalMessages : 0,
      triggers: {
        handoffCount,
        priorityIncreaseCount,
        vipRoutingCount,
        handoffRate: totalMessages > 0 ? (handoffCount / totalMessages) * 100 : 0,
      },
      costMetrics: {
        totalCost,
        avgCostPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0,
      },
    };
  },
});

/**
 * Get daily sentiment trends
 */
export const getDailySentimentTrends = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const startDate = getDateDaysAgo(days);
    const endDate = new Date().toISOString().split("T")[0];

    const trends = await ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.eq(q.field("hour"), undefined) // Daily only
        )
      )
      .collect();

    return trends.map(trend => ({
      date: trend.date,
      positive: trend.positiveCount,
      negative: trend.negativeCount,
      neutral: trend.neutralCount,
      angry: trend.angryCount,
      frustrated: trend.frustratedCount,
      urgent: trend.urgentCount,
      satisfied: trend.satisfiedCount,
      total: trend.totalAnalyses,
    }));
  },
});

/**
 * Get hourly sentiment trends for today
 */
export const getHourlySentimentTrends = query({
  args: {
    orgId: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date || new Date().toISOString().split("T")[0];

    const trends = await ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId).eq("date", date))
      .filter(q => q.neq(q.field("hour"), undefined))
      .collect();

    return trends.map(trend => ({
      hour: trend.hour,
      positive: trend.positiveCount,
      negative: trend.negativeCount,
      angry: trend.angryCount,
      frustrated: trend.frustratedCount,
      total: trend.totalAnalyses,
    }));
  },
});

/**
 * Get intent distribution
 */
export const getIntentDistribution = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(7);

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

    const analyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("analyzedAt"), startTimestamp),
          q.lte(q.field("analyzedAt"), endTimestamp)
        )
      )
      .collect();

    const distribution: Record<string, number> = {};

    for (const analysis of analyses) {
      distribution[analysis.intent] = (distribution[analysis.intent] || 0) + 1;
    }

    return Object.entries(distribution)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Get real-time sentiment overview
 */
export const getRealtimeSentimentOverview = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const last24h = Date.now() - 24 * 60 * 60 * 1000;

    // Get today's trends
    const todayTrend = await ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", today)
      )
      .filter(q => q.eq(q.field("hour"), undefined))
      .first();

    // Get last 24h analyses
    const recentAnalyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q => q.gte(q.field("analyzedAt"), last24h))
      .collect();

    const last10 = recentAnalyses.slice(0, 10);

    return {
      today: todayTrend || null,
      last24h: {
        total: recentAnalyses.length,
        positive: recentAnalyses.filter(a => a.sentiment === "positive").length,
        negative: recentAnalyses.filter(a => a.sentiment === "negative").length,
        angry: recentAnalyses.filter(a => a.sentiment === "angry").length,
      },
      recent: last10.map(a => ({
        sentiment: a.sentiment,
        intent: a.intent,
        sentimentScore: a.sentimentScore,
        timestamp: a.analyzedAt,
      })),
    };
  },
});

/**
 * Get trigger statistics
 */
export const getTriggerStatistics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(30);

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

    const triggers = await ctx.db
      .query("sentiment_triggers")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), startTimestamp),
          q.lte(q.field("createdAt"), endTimestamp)
        )
      )
      .collect();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const trigger of triggers) {
      byType[trigger.triggerType] = (byType[trigger.triggerType] || 0) + 1;
      byStatus[trigger.status] = (byStatus[trigger.status] || 0) + 1;
    }

    return {
      total: triggers.length,
      byType,
      byStatus,
      successRate: triggers.length > 0
        ? ((byStatus.executed || 0) / triggers.length) * 100
        : 0,
    };
  },
});

/**
 * Get sentiment comparison (current vs previous period)
 */
export const getSentimentComparison = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    
    const currentEnd = new Date().toISOString().split("T")[0];
    const currentStart = getDateDaysAgo(days);
    
    const previousEnd = getDateDaysAgo(days);
    const previousStart = getDateDaysAgo(days * 2);

    const currentStartTime = new Date(currentStart).getTime();
    const currentEndTime = new Date(currentEnd).getTime() + 24 * 60 * 60 * 1000;
    const previousStartTime = new Date(previousStart).getTime();
    const previousEndTime = new Date(previousEnd).getTime() + 24 * 60 * 60 * 1000;

    const allAnalyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.gte(q.field("analyzedAt"), previousStartTime)
      )
      .collect();

    const currentPeriod = allAnalyses.filter(a =>
      a.analyzedAt >= currentStartTime && a.analyzedAt <= currentEndTime
    );

    const previousPeriod = allAnalyses.filter(a =>
      a.analyzedAt >= previousStartTime && a.analyzedAt <= previousEndTime
    );

    const calculateMetrics = (analyses: any[]) => {
      const total = analyses.length;
      const positive = analyses.filter(a => a.sentiment === "positive").length;
      const negative = analyses.filter(a => a.sentiment === "negative").length;
      const avgScore = total > 0
        ? analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / total
        : 0;

      return {
        total,
        positive,
        negative,
        positiveRate: total > 0 ? (positive / total) * 100 : 0,
        negativeRate: total > 0 ? (negative / total) * 100 : 0,
        avgScore,
      };
    };

    const current = calculateMetrics(currentPeriod);
    const previous = calculateMetrics(previousPeriod);

    return {
      current,
      previous,
      change: {
        total: current.total - previous.total,
        positiveRate: current.positiveRate - previous.positiveRate,
        negativeRate: current.negativeRate - previous.negativeRate,
        avgScore: current.avgScore - previous.avgScore,
      },
    };
  },
});

/**
 * Update daily analytics
 */
export const updateDailyAnalytics = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    // Get today's analyses
    const analyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("analyzedAt"), todayStart),
          q.lt(q.field("analyzedAt"), todayEnd)
        )
      )
      .collect();

    if (analyses.length === 0) return { updated: false };

    // Calculate distribution
    const sentimentDist = {
      positive: 0,
      negative: 0,
      neutral: 0,
      angry: 0,
      urgent: 0,
      confused: 0,
      frustrated: 0,
      satisfied: 0,
    };

    const intentDist = {
      refund: 0,
      pricing: 0,
      technical_issue: 0,
      feature_request: 0,
      complaint: 0,
      general_inquiry: 0,
      other: 0,
    };

    let totalConfidence = 0;
    let totalAnalysisTime = 0;
    let totalCost = 0;
    let handoffCount = 0;
    let priorityCount = 0;
    let vipCount = 0;

    for (const analysis of analyses) {
      sentimentDist[analysis.sentiment as keyof typeof sentimentDist]++;
      
      if (analysis.intent in intentDist) {
        intentDist[analysis.intent as keyof typeof intentDist]++;
      } else {
        intentDist.other++;
      }

      totalConfidence += analysis.sentimentConfidence;
      totalCost += analysis.costUSD;

      if (analysis.triggeredHandoff) handoffCount++;
      if (analysis.triggeredPriorityIncrease) priorityCount++;
      if (analysis.triggeredVIPRouting) vipCount++;
    }

    const totalMessages = analyses.length;

    // Check if record exists
    const existing = await ctx.db
      .query("sentiment_analytics")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", today)
      )
      .first();

    const data = {
      totalMessages,
      analyzedMessages: totalMessages,
      analysisRate: 100,
      sentimentDistribution: sentimentDist,
      intentDistribution: intentDist,
      avgAnalysisTimeMs: totalAnalysisTime / totalMessages || 0,
      avgConfidence: totalConfidence / totalMessages || 0,
      totalTriggers: handoffCount + priorityCount + vipCount,
      handoffRate: (handoffCount / totalMessages) * 100 || 0,
      priorityIncreaseRate: (priorityCount / totalMessages) * 100 || 0,
      vipRoutingRate: (vipCount / totalMessages) * 100 || 0,
      totalCostUSD: totalCost,
      avgCostPerAnalysis: totalCost / totalMessages || 0,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("sentiment_analytics", {
        orgId: args.orgId,
        date: today,
        ...data,
        createdAt: Date.now(),
      });
    }

    return { updated: true };
  },
});

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}
