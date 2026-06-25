// @ts-nocheck
/**
 * CSAT Surveys Management
 * Handle survey creation, configuration, and distribution
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all surveys for an organization
 */
export const getSurveys = query({
  args: {
    orgId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("csat_surveys")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

    if (args.activeOnly) {
      query = ctx.db
        .query("csat_surveys")
        .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true));
    }

    const surveys = await query.collect();
    return surveys.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single survey by ID
 */
export const getSurvey = query({
  args: {
    surveyId: v.id("csat_surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    // Get recent ratings for this survey
    const recentRatings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_survey_id", (q) => q.eq("surveyId", args.surveyId))
      .order("desc")
      .take(10);

    return {
      ...survey,
      recentRatings,
    };
  },
});

/**
 * Get survey statistics
 */
export const getSurveyStats = query({
  args: {
    surveyId: v.id("csat_surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    const ratings = await ctx.db
      .query("csat_ratings")
      .withIndex("by_survey_id", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const totalResponses = ratings.length;
    const responseRate = survey.totalSent > 0 ? (totalResponses / survey.totalSent) * 100 : 0;

    const avgScore =
      totalResponses > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / totalResponses
        : 0;

    const scoreDistribution = ratings.reduce(
      (acc, r) => {
        const score = Math.round(r.score);
        acc[score] = (acc[score] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    );

    const satisfiedCount = (scoreDistribution[4] || 0) + (scoreDistribution[5] || 0);
    const csatScore = totalResponses > 0 ? (satisfiedCount / totalResponses) * 100 : 0;

    const totalComments = ratings.filter((r) => r.feedbackComment).length;

    return {
      totalSent: survey.totalSent,
      totalResponses,
      responseRate: Math.round(responseRate * 10) / 10,
      avgScore: Math.round(avgScore * 100) / 100,
      csatScore: Math.round(csatScore * 10) / 10,
      scoreDistribution,
      totalComments,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new survey
 */
export const createSurvey = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    surveyType: v.union(
      v.literal("post_conversation"),
      v.literal("periodic"),
      v.literal("triggered"),
      v.literal("manual")
    ),
    ratingType: v.union(
      v.literal("stars"),
      v.literal("emoji"),
      v.literal("thumbs"),
      v.literal("nps")
    ),
    primaryQuestion: v.string(),
    followupQuestion: v.optional(v.string()),
    triggerConditions: v.optional(v.any()),
    isActive: v.boolean(),
    allowComments: v.boolean(),
    requireComments: v.boolean(),
    showAgentName: v.boolean(),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    emailFromName: v.optional(v.string()),
    thankYouMessage: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const surveyId = await ctx.db.insert("csat_surveys", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      surveyType: args.surveyType,
      ratingType: args.ratingType,
      primaryQuestion: args.primaryQuestion,
      followupQuestion: args.followupQuestion,
      triggerConditions: args.triggerConditions,
      isActive: args.isActive,
      allowComments: args.allowComments,
      requireComments: args.requireComments,
      showAgentName: args.showAgentName,
      emailSubject: args.emailSubject,
      emailBody: args.emailBody,
      emailFromName: args.emailFromName,
      thankYouMessage: args.thankYouMessage,
      totalSent: 0,
      totalResponses: 0,
      responseRate: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return surveyId;
  },
});

/**
 * Update a survey
 */
export const updateSurvey = mutation({
  args: {
    surveyId: v.id("csat_surveys"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    primaryQuestion: v.optional(v.string()),
    followupQuestion: v.optional(v.string()),
    triggerConditions: v.optional(v.any()),
    allowComments: v.optional(v.boolean()),
    requireComments: v.optional(v.boolean()),
    showAgentName: v.optional(v.boolean()),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    emailFromName: v.optional(v.string()),
    thankYouMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { surveyId, ...updates } = args;

    await ctx.db.patch(surveyId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a survey
 */
export const deleteSurvey = mutation({
  args: {
    surveyId: v.id("csat_surveys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.surveyId);
    return { success: true };
  },
});

/**
 * Toggle survey active status
 */
export const toggleSurveyStatus = mutation({
  args: {
    surveyId: v.id("csat_surveys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.surveyId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get active survey for a conversation (based on trigger conditions)
 */
export const getSurveyForConversation = query({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    // Get conversation details
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return null;
    }

    // Get active post-conversation surveys
    const surveys = await ctx.db
      .query("csat_surveys")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .filter((q) => q.eq(q.field("surveyType"), "post_conversation"))
      .collect();

    // Find first matching survey based on trigger conditions
    for (const survey of surveys) {
      if (!survey.triggerConditions) {
        return survey; // No conditions = always match
      }

      const conditions = survey.triggerConditions as any;

      // Check if conversation is closed
      if (
        conditions.afterConversationClosed &&
        conversation.status !== "closed" &&
        conversation.status !== "resolved"
      ) {
        continue;
      }

      // Check channel types
      if (conditions.forChannels && conditions.forChannels.length > 0) {
        if (!conditions.forChannels.includes(conversation.channelType)) {
          continue;
        }
      }

      // Check priorities
      if (conditions.forPriorities && conditions.forPriorities.length > 0) {
        if (!conditions.forPriorities.includes(conversation.priority)) {
          continue;
        }
      }

      // All conditions passed
      return survey;
    }

    return null;
  },
});
