/**
 * CSAT Ratings Management
 * Handle customer satisfaction ratings and feedback
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get ratings for an organization
 */
export const getRatings = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc");

    let ratings = await query.take(args.limit || 50);

    // Filter by score if provided
    if (args.minScore !== undefined || args.maxScore !== undefined) {
      ratings = ratings.filter((rating) => {
        if (args.minScore !== undefined && rating.score < args.minScore) return false;
        if (args.maxScore !== undefined && rating.score > args.maxScore) return false;
        return true;
      });
    }

    // Enrich with conversation and customer data
    const enrichedRatings = await Promise.all(
      ratings.map(async (rating) => {
        const conversation = await ctx.db.get(rating.conversationId);
        const customer = rating.customerId
          ? await ctx.db.get(rating.customerId)
          : null;

        return {
          ...rating,
          conversation,
          customer,
        };
      })
    );

    return enrichedRatings;
  },
});

/**
 * Get a single rating by ID
 */
export const getRating = query({
  args: {
    ratingId: v.id("csat_ratings"),
  },
  handler: async (ctx, args) => {
    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      throw new Error("Rating not found");
    }

    const conversation = await ctx.db.get(rating.conversationId);
    const customer = rating.customerId ? await ctx.db.get(rating.customerId) : null;

    return {
      ...rating,
      conversation,
      customer,
    };
  },
});

/**
 * Get rating by survey token
 */
export const getRatingByToken = query({
  args: {
    surveyToken: v.string(),
  },
  handler: async (ctx, args) => {
    const rating = await ctx.db
      .query("csat_ratings")
      .withIndex("by_survey_token", (q) => q.eq("surveyToken", args.surveyToken))
      .first();

    return rating;
  },
});

/**
 * Get ratings for a conversation
 */
export const getConversationRatings = query({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();

    return ratings;
  },
});

/**
 * Get negative feedback that needs attention
 */
export const getNegativeFeedback = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.lte(q.field("score"), 2)) // 1-2 stars
      .filter((q) => q.gte(q.field("ratedAt"), cutoffDate))
      .order("desc")
      .collect();

    // Enrich with conversation and customer data
    const enrichedRatings = await Promise.all(
      ratings.map(async (rating) => {
        const conversation = await ctx.db.get(rating.conversationId);
        const customer = rating.customerId
          ? await ctx.db.get(rating.customerId)
          : null;

        return {
          ...rating,
          conversation,
          customer,
        };
      })
    );

    return enrichedRatings;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Submit a CSAT rating
 */
export const submitRating = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    customerId: v.optional(v.id("unified_customers")),
    ratingType: v.union(
      v.literal("stars"),
      v.literal("emoji"),
      v.literal("thumbs"),
      v.literal("nps")
    ),
    score: v.number(), // 1-5 normalized
    rawScore: v.optional(v.number()),
    feedbackComment: v.optional(v.string()),
    feedbackCategory: v.optional(v.string()),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    surveyId: v.optional(v.id("csat_surveys")),
    surveyToken: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate score
    if (args.score < 1 || args.score > 5) {
      throw new Error("Score must be between 1 and 5");
    }

    // Create rating
    const ratingId = await ctx.db.insert("csat_ratings", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      customerId: args.customerId,
      ratingType: args.ratingType,
      score: args.score,
      rawScore: args.rawScore,
      feedbackComment: args.feedbackComment,
      feedbackCategory: args.feedbackCategory as any,
      agentId: args.agentId,
      agentName: args.agentName,
      surveyId: args.surveyId,
      surveyToken: args.surveyToken,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      tags: args.tags,
      ratedAt: now,
      createdAt: now,
    });

    // Update conversation CSAT score
    await ctx.db.patch(args.conversationId, {
      csatScore: args.score,
    });

    // Update survey statistics if survey provided
    if (args.surveyId) {
      const survey = await ctx.db.get(args.surveyId);
      if (survey) {
        const totalResponses = survey.totalResponses + 1;
        const responseRate =
          survey.totalSent > 0 ? (totalResponses / survey.totalSent) * 100 : 0;

        // Calculate new average score
        const currentTotal = (survey.avgScore || 0) * survey.totalResponses;
        const newAvgScore = (currentTotal + args.score) / totalResponses;

        await ctx.db.patch(args.surveyId, {
          totalResponses,
          responseRate,
          avgScore: newAvgScore,
          updatedAt: now,
        });
      }
    }

    return ratingId;
  },
});

/**
 * Update a rating (e.g., add feedback after initial rating)
 */
export const updateRating = mutation({
  args: {
    ratingId: v.id("csat_ratings"),
    feedbackComment: v.optional(v.string()),
    feedbackCategory: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { ratingId, ...updates } = args;

    await ctx.db.patch(ratingId, {
      ...updates,
      feedbackCategory: updates.feedbackCategory as any,
    });

    return { success: true };
  },
});

/**
 * Generate survey token for sending survey links
 */
export const generateSurveyToken = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    surveyId: v.id("csat_surveys"),
  },
  handler: async (ctx, args) => {
    // Generate unique token
    const token = `${args.orgId}_${args.conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update survey sent count
    const survey = await ctx.db.get(args.surveyId);
    if (survey) {
      await ctx.db.patch(args.surveyId, {
        totalSent: survey.totalSent + 1,
        updatedAt: Date.now(),
      });
    }

    return { token };
  },
});
