/**
 * Automatic Summarization - Generator
 * Generates conversation summaries with AI
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Generate conversation summary (action - can call external APIs)
 */
export const generateSummary = action({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
  },
  handler: async (ctx, args) => {
    // Create job
    const jobId = await ctx.runMutation(internal.summarization.generator.createJob, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      summaryType: "manual",
    });

    try {
      // Get conversation messages
      const messages = await ctx.runQuery(internal.summarization.generator.getConversationMessages, {
        conversationId: args.conversationId,
      });

      if (!messages || messages.length === 0) {
        throw new Error("No messages found in conversation");
      }

      // Prepare conversation text
      const conversationText = messages
        .map((m) => `${m.senderName} (${m.senderType}): ${m.content}`)
        .join("\n\n");

      // Call AI provider
      const provider = args.provider || "openai";
      const apiKey = provider === "openai" 
        ? process.env.OPENAI_API_KEY
        : process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error(`${provider} API key not configured`);
      }

      let summary;
      let tokensUsed = 0;
      let costUSD = 0;

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are an expert at analyzing customer support conversations. Analyze the following conversation and provide:
1. SHORT_SUMMARY: A 1-2 sentence overview
2. DETAILED_SUMMARY: A comprehensive summary covering all key points
3. ROOT_CAUSE: The underlying cause of the customer's issue (if applicable)
4. RESOLUTION_STEPS: Step-by-step resolution (if resolved)
5. SENTIMENT: Overall sentiment (positive/negative/neutral) with score -1 to 1
6. ACTION_ITEMS: Clear action items with priorities
7. TAGS: Relevant tags for categorization

Format your response as JSON with these exact keys: shortSummary, detailedSummary, rootCause, resolutionSteps (array), sentiment, sentimentScore, actionItems (array of {description, priority}), tags (array).`,
              },
              {
                role: "user",
                content: conversationText,
              },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        summary = JSON.parse(data.choices[0].message.content);
        tokensUsed = data.usage.total_tokens;
        costUSD = (data.usage.prompt_tokens * 0.03 + data.usage.completion_tokens * 0.06) / 1000;
      } else {
        // Anthropic
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: 2000,
            messages: [
              {
                role: "user",
                content: `Analyze this customer support conversation and provide a JSON response with: shortSummary, detailedSummary, rootCause, resolutionSteps (array), sentiment, sentimentScore (-1 to 1), actionItems (array of {description, priority}), tags (array).\n\nConversation:\n${conversationText}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0].text;
        summary = JSON.parse(content);
        tokensUsed = data.usage.input_tokens + data.usage.output_tokens;
        costUSD = (data.usage.input_tokens * 0.003 + data.usage.output_tokens * 0.015) / 1000;
      }

      // Validate and normalize action items
      const actionItems = (summary.actionItems || []).map((item: any) => ({
        description: item.description || item.text || String(item),
        priority: ["low", "medium", "high"].includes(item.priority) 
          ? item.priority 
          : "medium",
        assignedTo: item.assignedTo,
        dueDate: item.dueDate,
        completed: false,
      }));

      // Save summary
      const summaryId = await ctx.runMutation(internal.summarization.generator.saveSummary, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        shortSummary: summary.shortSummary || "No summary available",
        detailedSummary: summary.detailedSummary || "No detailed summary available",
        rootCause: summary.rootCause,
        resolutionSteps: summary.resolutionSteps || [],
        sentiment: summary.sentiment || "neutral",
        sentimentScore: summary.sentimentScore || 0,
        actionItems,
        tags: summary.tags || [],
        provider,
        model: provider === "openai" ? "gpt-4" : "claude-3-sonnet-20240229",
        tokensUsed,
        costUSD,
        messageCount: messages.length,
        timeRangeStart: messages[0]?.timestamp || Date.now(),
        timeRangeEnd: messages[messages.length - 1]?.timestamp || Date.now(),
      });

      // Complete job
      await ctx.runMutation(internal.summarization.generator.completeJob, {
        jobId,
        summaryId,
        tokensUsed,
        costUSD,
      });

      return { success: true, summaryId, tokensUsed, costUSD };
    } catch (error: any) {
      // Fail job
      await ctx.runMutation(internal.summarization.generator.failJob, {
        jobId,
        errorMessage: error.message,
      });

      throw error;
    }
  },
});

/**
 * Get conversation summary
 */
export const getSummary = query({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("conversation_summaries")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();

    return summary;
  },
});

/**
 * Get all summaries for org
 */
export const getSummaries = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("conversation_summaries")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc");

    let summaries = await query.collect();

    if (args.status && args.status.length > 0) {
      summaries = summaries.filter((s) => args.status!.includes(s.status));
    }

    const limit = args.limit || 50;
    return summaries.slice(0, limit);
  },
});

/**
 * Update summary
 */
export const updateSummary = mutation({
  args: {
    summaryId: v.id("conversation_summaries"),
    shortSummary: v.optional(v.string()),
    detailedSummary: v.optional(v.string()),
    rootCause: v.optional(v.string()),
    resolutionSteps: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { summaryId, ...updates } = args;

    await ctx.db.patch(summaryId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark action item as completed
 */
export const completeActionItem = mutation({
  args: {
    summaryId: v.id("conversation_summaries"),
    actionItemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    const actionItems = [...summary.actionItems];
    if (actionItemIndex >= actionItems.length) {
      throw new Error("Action item not found");
    }

    actionItems[args.actionItemIndex].completed = true;

    await ctx.db.patch(args.summaryId, {
      actionItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── Internal Functions ────────────────────────────────────────────────────

/**
 * Create summary generation job (internal)
 */
export const createJob = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    summaryType: v.union(v.literal("manual"), v.literal("auto"), v.literal("scheduled")),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("summary_generation_jobs", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      summaryType: args.summaryType,
      trigger: args.trigger,
      status: "pending",
      createdAt: Date.now(),
    });

    return jobId;
  },
});

/**
 * Get conversation messages (internal query)
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("unified_messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Save generated summary (internal)
 */
export const saveSummary = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    shortSummary: v.string(),
    detailedSummary: v.string(),
    rootCause: v.optional(v.string()),
    resolutionSteps: v.array(v.string()),
    sentiment: v.string(),
    sentimentScore: v.number(),
    actionItems: v.array(v.any()),
    tags: v.array(v.string()),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
    messageCount: v.number(),
    timeRangeStart: v.number(),
    timeRangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for existing summary
    const existing = await ctx.db
      .query("conversation_summaries")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();

    const version = existing ? existing.version + 1 : 1;

    // Mark old summary as outdated
    if (existing) {
      await ctx.db.patch(existing._id, { status: "outdated" });
    }

    const summaryId = await ctx.db.insert("conversation_summaries", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      shortSummary: args.shortSummary,
      detailedSummary: args.detailedSummary,
      rootCause: args.rootCause,
      resolutionSteps: args.resolutionSteps,
      sentiment: args.sentiment,
      sentimentScore: args.sentimentScore,
      actionItems: args.actionItems,
      tags: args.tags,
      categories: [],
      provider: args.provider,
      model: args.model,
      tokensUsed: args.tokensUsed,
      costUSD: args.costUSD,
      status: "completed",
      version,
      previousVersionId: existing?._id,
      messageCount: args.messageCount,
      timeRangeStart: args.timeRangeStart,
      timeRangeEnd: args.timeRangeEnd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generatedBy: "system",
    });

    return summaryId;
  },
});

/**
 * Complete job (internal)
 */
export const completeJob = internalMutation({
  args: {
    jobId: v.id("summary_generation_jobs"),
    summaryId: v.id("conversation_summaries"),
    tokensUsed: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      summaryId: args.summaryId,
      tokensUsed: args.tokensUsed,
      costUSD: args.costUSD,
      completedAt: Date.now(),
    });
  },
});

/**
 * Fail job (internal)
 */
export const failJob = internalMutation({
  args: {
    jobId: v.id("summary_generation_jobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});
