/**
 * AI Sentiment & Intent Analysis Engine
 * Detects sentiment, classifies intent, and triggers actions
 */

import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyze sentiment and intent for a message
 */
export const analyzeMessage = action({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    orgId: v.string(),
    messageContent: v.string(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
  },
  handler: async (ctx, args) => {
    // Only analyze user messages by default
    if (args.messageType === "assistant") {
      return { skipped: true, reason: "Assistant messages not analyzed" };
    }

    const provider = args.provider || "openai";
    const startTime = Date.now();

    try {
      // Perform AI analysis
      const analysis = await performAIAnalysis(
        args.messageContent,
        provider
      );

      // Store analysis results
      const analysisId = await ctx.runMutation(internal.sentiment.analyzer.storeAnalysis, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        messageId: args.messageId,
        messageContent: args.messageContent,
        messageType: args.messageType,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        sentimentConfidence: analysis.sentimentConfidence,
        intent: analysis.intent,
        intentScore: analysis.intentScore,
        intentConfidence: analysis.intentConfidence,
        secondaryIntents: analysis.secondaryIntents,
        analyzedBy: provider,
        model: analysis.model,
        tokensUsed: analysis.tokensUsed,
        costUSD: analysis.costUSD,
      });

      // Check for triggers
      const triggers = await ctx.runMutation(internal.sentiment.analyzer.checkTriggers, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        analysisId,
      });

      // Update trends
      await ctx.runMutation(internal.sentiment.analyzer.updateTrends, {
        orgId: args.orgId,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
      });

      return {
        analysisId,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        intent: analysis.intent,
        intentScore: analysis.intentScore,
        triggers,
        analysisTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Error analyzing message:", error);
      throw new Error(`Analysis failed: ${error}`);
    }
  },
});

/**
 * Perform AI sentiment and intent analysis
 */
async function performAIAnalysis(
  content: string,
  provider: "openai" | "anthropic"
) {
  const systemPrompt = `You are an expert sentiment and intent classifier for customer support messages.

Analyze the message and return a JSON object with:

1. **sentiment**: One of: positive, negative, neutral, angry, urgent, confused, frustrated, satisfied
2. **sentimentScore**: Number from -1 (very negative) to 1 (very positive)
3. **sentimentConfidence**: Confidence level 0-1

4. **intent**: Primary intent, one of:
   - refund: Customer wants money back
   - pricing: Questions about cost or plans
   - technical_issue: Something not working
   - feature_request: Wants new functionality
   - complaint: General complaint
   - general_inquiry: General question
   - feedback: Providing feedback
   - cancel_subscription: Wants to cancel
   - billing_issue: Problem with payment
   - account_issue: Login or account problem

5. **intentScore**: Confidence in primary intent (0-1)
6. **intentConfidence**: Overall confidence (0-1)
7. **secondaryIntents**: Array of other possible intents with scores

Example response:
{
  "sentiment": "frustrated",
  "sentimentScore": -0.6,
  "sentimentConfidence": 0.85,
  "intent": "technical_issue",
  "intentScore": 0.9,
  "intentConfidence": 0.88,
  "secondaryIntents": [
    {"intent": "complaint", "score": 0.6},
    {"intent": "refund", "score": 0.3}
  ]
}`;

  try {
    if (provider === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this message:\n\n${content}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costUSD = calculateOpenAICost("gpt-4o-mini", tokensUsed);

      return {
        ...result,
        model: "gpt-4o-mini",
        tokensUsed,
        costUSD,
      };
    } else {
      const completion = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: `Analyze this message:\n\n${content}` },
        ],
        temperature: 0.2,
      });

      const content_block = completion.content[0];
      const text = content_block.type === "text" ? content_block.text : "{}";
      const result = JSON.parse(text);

      const tokensUsed = completion.usage.input_tokens + completion.usage.output_tokens;
      const costUSD = calculateAnthropicCost("claude-3-haiku-20240307", tokensUsed);

      return {
        ...result,
        model: "claude-3-haiku-20240307",
        tokensUsed,
        costUSD,
      };
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}

function calculateOpenAICost(model: string, tokens: number): number {
  const costs = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
  };
  const modelCost = costs[model as keyof typeof costs] || costs["gpt-4o-mini"];
  return ((tokens / 1000) * (modelCost.input + modelCost.output)) / 2;
}

function calculateAnthropicCost(model: string, tokens: number): number {
  const costs = {
    "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  };
  const modelCost = costs[model as keyof typeof costs] || costs["claude-3-haiku-20240307"];
  return ((tokens / 1000) * (modelCost.input + modelCost.output)) / 2;
}

/**
 * Store analysis results
 */
export const storeAnalysis = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    messageContent: v.string(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    sentiment: v.string(),
    sentimentScore: v.number(),
    sentimentConfidence: v.number(),
    intent: v.string(),
    intentScore: v.number(),
    intentConfidence: v.number(),
    secondaryIntents: v.optional(v.array(v.object({
      intent: v.string(),
      score: v.number(),
    }))),
    analyzedBy: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const analysisId = await ctx.db.insert("sentiment_analysis", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      sentiment: args.sentiment as any,
      sentimentScore: args.sentimentScore,
      sentimentConfidence: args.sentimentConfidence,
      intent: args.intent as any,
      intentScore: args.intentScore,
      intentConfidence: args.intentConfidence,
      secondaryIntents: args.secondaryIntents,
      messageContent: args.messageContent,
      messageType: args.messageType,
      analyzedBy: args.analyzedBy,
      model: args.model,
      tokensUsed: args.tokensUsed,
      costUSD: args.costUSD,
      triggeredHandoff: false,
      triggeredPriorityIncrease: false,
      triggeredVIPRouting: false,
      analyzedAt: now,
      createdAt: now,
    });

    return analysisId;
  },
});

/**
 * Check and execute triggers based on analysis
 */
export const checkTriggers = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    analysisId: v.id("sentiment_analysis"),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return [];

    // Get active rules for this org
    const rules = await ctx.db
      .query("sentiment_rules")
      .withIndex("by_org_active", q =>
        q.eq("orgId", args.orgId).eq("isActive", true)
      )
      .order("desc") // Higher priority first
      .collect();

    const triggersCreated = [];

    for (const rule of rules) {
      // Check if rule conditions match
      const matches = await checkRuleConditions(ctx, rule, analysis, args.conversationId);

      if (matches) {
        // Execute rule actions
        const trigger = await executeRuleActions(
          ctx,
          rule,
          args.conversationId,
          args.analysisId,
          analysis
        );

        if (trigger) {
          triggersCreated.push(trigger);
        }

        // Update rule execution count
        await ctx.db.patch(rule._id, {
          executionCount: rule.executionCount + 1,
          lastExecutedAt: Date.now(),
        });
      }
    }

    return triggersCreated;
  },
});

async function checkRuleConditions(
  ctx: any,
  rule: any,
  analysis: any,
  conversationId: Id<"conversations">
): Promise<boolean> {
  const conditions = rule.conditions;

  // Check sentiment match
  if (conditions.sentiments && conditions.sentiments.length > 0) {
    if (!conditions.sentiments.includes(analysis.sentiment)) {
      return false;
    }
  }

  // Check intent match
  if (conditions.intents && conditions.intents.length > 0) {
    if (!conditions.intents.includes(analysis.intent)) {
      return false;
    }
  }

  // Check sentiment score range
  if (conditions.minSentimentScore !== undefined) {
    if (analysis.sentimentScore < conditions.minSentimentScore) {
      return false;
    }
  }

  if (conditions.maxSentimentScore !== undefined) {
    if (analysis.sentimentScore > conditions.maxSentimentScore) {
      return false;
    }
  }

  // Check confidence
  if (conditions.minConfidence !== undefined) {
    if (analysis.sentimentConfidence < conditions.minConfidence) {
      return false;
    }
  }

  // Check consecutive negative messages
  if (conditions.consecutiveNegative) {
    const recentAnalyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_conversation_date", q => q.eq("conversationId", conversationId))
      .order("desc")
      .take(conditions.consecutiveNegative)
      .collect();

    const allNegative = recentAnalyses.every((a: any) =>
      ["negative", "angry", "frustrated"].includes(a.sentiment)
    );

    if (!allNegative) {
      return false;
    }
  }

  return true;
}

async function executeRuleActions(
  ctx: any,
  rule: any,
  conversationId: Id<"conversations">,
  analysisId: Id<"sentiment_analysis">,
  analysis: any
) {
  const actions = rule.actions;
  const conditions = [];

  // Prepare trigger
  let triggerType: any = "escalation";
  let reason = `Rule "${rule.name}" matched`;

  if (actions.triggerHandoff) {
    triggerType = "human_handoff";
    reason = `Sentiment: ${analysis.sentiment}, Intent: ${analysis.intent}`;
    conditions.push({ type: "handoff", value: true });

    // Update analysis
    await ctx.db.patch(analysisId, {
      triggeredHandoff: true,
      triggerReason: reason,
    });
  }

  if (actions.increasePriority) {
    triggerType = "priority_increase";
    conditions.push({
      type: "priority",
      value: actions.increasePriority,
    });

    // Update conversation priority
    const conversation = await ctx.db.get(conversationId);
    if (conversation) {
      await ctx.db.patch(conversationId, {
        priority: actions.increasePriority,
      });
    }

    await ctx.db.patch(analysisId, {
      triggeredPriorityIncrease: true,
    });
  }

  if (actions.routeToVIP) {
    triggerType = "vip_routing";
    conditions.push({ type: "vip", value: true });

    await ctx.db.patch(analysisId, {
      triggeredVIPRouting: true,
    });
  }

  // Create trigger record
  const triggerId = await ctx.db.insert("sentiment_triggers", {
    orgId: rule.orgId,
    conversationId,
    sentimentAnalysisId: analysisId,
    triggerType,
    reason,
    conditions,
    status: "executed",
    executedAt: Date.now(),
    createdAt: Date.now(),
  });

  return triggerId;
}

/**
 * Update sentiment trends
 */
export const updateTrends = mutation({
  args: {
    orgId: v.string(),
    sentiment: v.string(),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date(now).toISOString().split("T")[0];
    const hour = new Date(now).getUTCHours();

    // Update daily trends
    const dailyTrend = await ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", date)
      )
      .filter(q => q.eq(q.field("hour"), undefined))
      .first();

    if (dailyTrend) {
      await updateTrendRecord(ctx, dailyTrend, args.sentiment, args.intent);
    } else {
      await createTrendRecord(ctx, args.orgId, date, undefined, args.sentiment, args.intent);
    }

    // Update hourly trends
    const hourlyTrend = await ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date_hour", q =>
        q.eq("orgId", args.orgId).eq("date", date).eq("hour", hour)
      )
      .first();

    if (hourlyTrend) {
      await updateTrendRecord(ctx, hourlyTrend, args.sentiment, args.intent);
    } else {
      await createTrendRecord(ctx, args.orgId, date, hour, args.sentiment, args.intent);
    }
  },
});

async function updateTrendRecord(ctx: any, trend: any, sentiment: string, intent: string) {
  const updates: any = {
    totalAnalyses: trend.totalAnalyses + 1,
    updatedAt: Date.now(),
  };

  // Update sentiment counts
  const sentimentKey = `${sentiment}Count`;
  if (sentimentKey in trend) {
    updates[sentimentKey] = trend[sentimentKey] + 1;
  }

  // Update intent counts
  const intentKey = `${intent.replace(/_/g, "")}Count`;
  if (intentKey in trend) {
    updates[intentKey] = trend[intentKey] + 1;
  } else if (intent === "technical_issue") {
    updates.technicalIssueCount = trend.technicalIssueCount + 1;
  } else if (intent === "feature_request") {
    updates.featureRequestCount = trend.featureRequestCount + 1;
  } else if (intent === "general_inquiry") {
    updates.generalInquiryCount = trend.generalInquiryCount + 1;
  }

  await ctx.db.patch(trend._id, updates);
}

async function createTrendRecord(
  ctx: any,
  orgId: string,
  date: string,
  hour: number | undefined,
  sentiment: string,
  intent: string
) {
  const now = Date.now();

  await ctx.db.insert("sentiment_trends", {
    orgId,
    date,
    hour,
    positiveCount: sentiment === "positive" ? 1 : 0,
    negativeCount: sentiment === "negative" ? 1 : 0,
    neutralCount: sentiment === "neutral" ? 1 : 0,
    angryCount: sentiment === "angry" ? 1 : 0,
    urgentCount: sentiment === "urgent" ? 1 : 0,
    confusedCount: sentiment === "confused" ? 1 : 0,
    frustratedCount: sentiment === "frustrated" ? 1 : 0,
    satisfiedCount: sentiment === "satisfied" ? 1 : 0,
    avgSentimentScore: 0,
    avgConfidence: 0,
    refundCount: intent === "refund" ? 1 : 0,
    pricingCount: intent === "pricing" ? 1 : 0,
    technicalIssueCount: intent === "technical_issue" ? 1 : 0,
    featureRequestCount: intent === "feature_request" ? 1 : 0,
    complaintCount: intent === "complaint" ? 1 : 0,
    generalInquiryCount: intent === "general_inquiry" ? 1 : 0,
    handoffTriggered: 0,
    priorityIncreased: 0,
    vipRouted: 0,
    totalAnalyses: 1,
    totalConversations: 1,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Get sentiment analysis for a conversation
 */
export const getConversationSentiment = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const analyses = await ctx.db
      .query("sentiment_analysis")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();

    return analyses;
  },
});

/**
 * Get sentiment trends for organization
 */
export const getSentimentTrends = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    includeHourly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const endDate = args.endDate || new Date().toISOString().split("T")[0];
    const startDate = args.startDate || getDateDaysAgo(30);

    let query = ctx.db
      .query("sentiment_trends")
      .withIndex("by_org_date", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      );

    if (!args.includeHourly) {
      query = query.filter(q => q.eq(q.field("hour"), undefined));
    }

    const trends = await query.collect();
    return trends;
  },
});

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}
