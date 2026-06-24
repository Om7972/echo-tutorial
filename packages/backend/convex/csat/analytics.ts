/**
 * CSAT Analytics
 * Calculate CSAT scores, trends, and generate analytics
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get CSAT analytics for an organization
 */
export const getAnalytics = query({
  args: {
    orgId: v.string(),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dateFrom = args.dateFrom || Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    const dateTo = args.dateTo || Date.now();

    // Get all ratings in date range
    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => 
        q.and(
          q.gte(q.field("ratedAt"), dateFrom),
          q.lte(q.field("ratedAt"), dateTo)
        )
      )
      .collect();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        avgScore: 0,
        csatScore: 0,
        scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        npsScore: null,
        totalComments: 0,
        negativeComments: 0,
        positiveComments: 0,
        categoryBreakdown: {},
        topAgents: [],
        trend: { direction: "stable", percentage: 0 },
      };
    }

    // Calculate average score
    const avgScore = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

    // Calculate score distribution
    const scoreDistribution = ratings.reduce(
      (acc, r) => {
        const score = Math.round(r.score);
        acc[score] = (acc[score] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    );

    // Calculate CSAT score (% of 4-5 ratings)
    const satisfiedCount = (scoreDistribution[4] || 0) + (scoreDistribution[5] || 0);
    const csatScore = (satisfiedCount / ratings.length) * 100;

    // Calculate NPS if any NPS ratings
    const npsRatings = ratings.filter((r) => r.ratingType === "nps" && r.rawScore !== undefined);
    let npsScore = null;
    let promoterCount = 0;
    let passiveCount = 0;
    let detractorCount = 0;

    if (npsRatings.length > 0) {
      promoterCount = npsRatings.filter((r) => r.rawScore! >= 9).length;
      passiveCount = npsRatings.filter((r) => r.rawScore! >= 7 && r.rawScore! <= 8).length;
      detractorCount = npsRatings.filter((r) => r.rawScore! <= 6).length;

      const promoterPercentage = (promoterCount / npsRatings.length) * 100;
      const detractorPercentage = (detractorCount / npsRatings.length) * 100;
      npsScore = Math.round(promoterPercentage - detractorPercentage);
    }

    // Calculate comments
    const totalComments = ratings.filter((r) => r.feedbackComment).length;
    const negativeComments = ratings.filter(
      (r) => r.feedbackComment && r.score <= 2
    ).length;
    const positiveComments = ratings.filter(
      (r) => r.feedbackComment && r.score >= 4
    ).length;

    // Category breakdown
    const categoryBreakdown = ratings
      .filter((r) => r.feedbackCategory)
      .reduce((acc, r) => {
        const category = r.feedbackCategory!;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Top agents
    const agentScores = ratings
      .filter((r) => r.agentId)
      .reduce((acc, r) => {
        const agentId = r.agentId!;
        if (!acc[agentId]) {
          acc[agentId] = {
            agentId,
            agentName: r.agentName || "Unknown",
            totalScore: 0,
            count: 0,
          };
        }
        acc[agentId].totalScore += r.score;
        acc[agentId].count += 1;
        return acc;
      }, {} as Record<string, any>);

    const topAgents = Object.values(agentScores)
      .map((agent: any) => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        avgScore: agent.totalScore / agent.count,
        totalRatings: agent.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    // Calculate trend (compare with previous period)
    const previousPeriodStart = dateFrom - (dateTo - dateFrom);
    const previousRatings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => 
        q.and(
          q.gte(q.field("ratedAt"), previousPeriodStart),
          q.lt(q.field("ratedAt"), dateFrom)
        )
      )
      .collect();

    let trend = { direction: "stable" as const, percentage: 0 };
    if (previousRatings.length > 0) {
      const previousAvg =
        previousRatings.reduce((sum, r) => sum + r.score, 0) / previousRatings.length;
      const change = ((avgScore - previousAvg) / previousAvg) * 100;

      if (Math.abs(change) > 5) {
        trend = {
          direction: change > 0 ? ("up" as const) : ("down" as const),
          percentage: Math.abs(change),
        };
      }
    }

    return {
      totalRatings: ratings.length,
      avgScore: Math.round(avgScore * 100) / 100,
      csatScore: Math.round(csatScore * 10) / 10,
      scoreDistribution,
      npsScore,
      promoterCount,
      passiveCount,
      detractorCount,
      totalComments,
      negativeComments,
      positiveComments,
      categoryBreakdown,
      topAgents,
      trend,
    };
  },
});

/**
 * Get CSAT trend over time
 */
export const getTrend = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const groupBy = args.groupBy || "day";
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("ratedAt"), cutoffDate))
      .collect();

    // Group ratings by date
    const grouped: Record<string, { date: string; scores: number[]; count: number }> = {};

    ratings.forEach((rating) => {
      const date = new Date(rating.ratedAt);
      let key: string;

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, scores: [], count: 0 };
      }
      grouped[key].scores.push(rating.score);
      grouped[key].count++;
    });

    // Calculate averages and CSAT scores
    const trend = Object.values(grouped)
      .map((group) => {
        const avgScore = group.scores.reduce((sum, s) => sum + s, 0) / group.scores.length;
        const satisfiedCount = group.scores.filter((s) => s >= 4).length;
        const csatScore = (satisfiedCount / group.scores.length) * 100;

        return {
          date: group.date,
          avgScore: Math.round(avgScore * 100) / 100,
          csatScore: Math.round(csatScore * 10) / 10,
          totalRatings: group.count,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return trend;
  },
});

/**
 * Get daily analytics record
 */
export const getDailyAnalytics = query({
  args: {
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("csat_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date))
      .first();

    return analytics;
  },
});

/**
 * Get analytics for date range
 */
export const getAnalyticsRange = query({
  args: {
    orgId: v.string(),
    dateFrom: v.string(), // YYYY-MM-DD
    dateTo: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("csat_analytics")
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

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Generate daily analytics (to be run by cron job)
 */
export const generateDailyAnalytics = internalMutation({
  args: {
    orgId: v.string(),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Get all ratings for the day
    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("ratedAt"), startOfDay),
          q.lt(q.field("ratedAt"), endOfDay)
        )
      )
      .collect();

    if (ratings.length === 0) {
      // No ratings for this day
      return null;
    }

    // Calculate metrics
    const totalRatings = ratings.length;
    const avgScore = ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings;

    // Score distribution
    const scoreDistribution = ratings.reduce(
      (acc, r) => {
        const score = Math.round(r.score);
        acc[`score${score}Count`] = (acc[`score${score}Count`] || 0) + 1;
        return acc;
      },
      {
        score1Count: 0,
        score2Count: 0,
        score3Count: 0,
        score4Count: 0,
        score5Count: 0,
      }
    );

    // CSAT score
    const satisfiedCount = scoreDistribution.score4Count + scoreDistribution.score5Count;
    const csatScore = (satisfiedCount / totalRatings) * 100;

    // NPS calculation
    const npsRatings = ratings.filter((r) => r.ratingType === "nps" && r.rawScore !== undefined);
    let npsScore = null;
    let promoterCount = 0;
    let passiveCount = 0;
    let detractorCount = 0;

    if (npsRatings.length > 0) {
      promoterCount = npsRatings.filter((r) => r.rawScore! >= 9).length;
      passiveCount = npsRatings.filter((r) => r.rawScore! >= 7 && r.rawScore! <= 8).length;
      detractorCount = npsRatings.filter((r) => r.rawScore! <= 6).length;

      const promoterPercentage = (promoterCount / npsRatings.length) * 100;
      const detractorPercentage = (detractorCount / npsRatings.length) * 100;
      npsScore = Math.round(promoterPercentage - detractorPercentage);
    }

    // Comments
    const totalComments = ratings.filter((r) => r.feedbackComment).length;
    const negativeComments = ratings.filter((r) => r.feedbackComment && r.score <= 2).length;
    const positiveComments = ratings.filter((r) => r.feedbackComment && r.score >= 4).length;

    // Category breakdown
    const categoryBreakdown = ratings
      .filter((r) => r.feedbackCategory)
      .reduce((acc, r) => {
        const category = r.feedbackCategory!;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += 1;
        return acc;
      }, {} as Record<string, number>);

    // Top agents
    const agentScores = ratings
      .filter((r) => r.agentId)
      .reduce((acc, r) => {
        const agentId = r.agentId!;
        if (!acc[agentId]) {
          acc[agentId] = {
            agentId,
            agentName: r.agentName || "Unknown",
            totalScore: 0,
            count: 0,
          };
        }
        acc[agentId].totalScore += r.score;
        acc[agentId].count += 1;
        return acc;
      }, {} as Record<string, any>);

    const topAgents = Object.values(agentScores)
      .map((agent: any) => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        avgScore: agent.totalScore / agent.count,
        totalRatings: agent.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    // Calculate trend
    const previousDate = new Date(startOfDay - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const previousAnalytics = await ctx.db
      .query("csat_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", previousDate))
      .first();

    let trendDirection: "up" | "down" | "stable" = "stable";
    let trendPercentage = 0;

    if (previousAnalytics && previousAnalytics.avgScore > 0) {
      const change = ((avgScore - previousAnalytics.avgScore) / previousAnalytics.avgScore) * 100;
      if (Math.abs(change) > 5) {
        trendDirection = change > 0 ? "up" : "down";
        trendPercentage = Math.abs(change);
      }
    }

    // Check if record exists
    const existing = await ctx.db
      .query("csat_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId).eq("date", args.date))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        totalRatings,
        avgScore: Math.round(avgScore * 100) / 100,
        ...scoreDistribution,
        csatScore: Math.round(csatScore * 10) / 10,
        npsScore,
        promoterCount,
        passiveCount,
        detractorCount,
        totalComments,
        negativeComments,
        positiveComments,
        categoryBreakdown,
        topAgents,
        trendDirection,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        updatedAt: now,
      });

      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("csat_analytics", {
        orgId: args.orgId,
        date: args.date,
        totalRatings,
        avgScore: Math.round(avgScore * 100) / 100,
        ...scoreDistribution,
        csatScore: Math.round(csatScore * 10) / 10,
        npsScore,
        promoterCount,
        passiveCount,
        detractorCount,
        totalComments,
        negativeComments,
        positiveComments,
        categoryBreakdown,
        topAgents,
        trendDirection,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
