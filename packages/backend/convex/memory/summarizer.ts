/**
 * MemorySummarizer - Intelligent conversation summarization with AI
 * Generates summaries with customer insights, sentiment analysis, and key information extraction
 */

import { v } from "convex/values";
import { action, internalAction, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Summarize a conversation or set of memories
 */
export const summarizeConversation = action({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    memoryIds: v.optional(v.array(v.id("conversation_memories"))),
    summaryType: v.optional(v.union(
      v.literal("rolling"),
      v.literal("periodic"),
      v.literal("thematic"),
      v.literal("final")
    )),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
  },
  handler: async (ctx, args) => {
    const provider = args.provider || "openai";
    const summaryType = args.summaryType || "rolling";

    // Fetch conversation and messages
    const conversation = await ctx.runQuery(internal.memory.summarizer.getConversationContext, {
      conversationId: args.conversationId,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Fetch memories if specified, otherwise get recent messages
    let contentToSummarize = "";
    let messageCount = 0;
    let timeRangeStart = Date.now();
    let timeRangeEnd = Date.now();

    if (args.memoryIds && args.memoryIds.length > 0) {
      const memories = await ctx.runQuery(internal.memory.summarizer.getMemoriesByIds, {
        memoryIds: args.memoryIds,
      });
      
      contentToSummarize = memories.map(m => m.content).join("\n\n");
      messageCount = memories.length;
      timeRangeStart = Math.min(...memories.map(m => m.createdAt));
      timeRangeEnd = Math.max(...memories.map(m => m.updatedAt));
    } else {
      // Get recent messages
      const messages = await ctx.runQuery(internal.memory.summarizer.getConversationMessages, {
        conversationId: args.conversationId,
        limit: 50,
      });
      
      contentToSummarize = messages.map(m => `${m.senderType}: ${m.content}`).join("\n");
      messageCount = messages.length;
      if (messages.length > 0) {
        timeRangeStart = messages[messages.length - 1].timestamp;
        timeRangeEnd = messages[0].timestamp;
      }
    }

    // Generate summary using AI
    const summaryResult = await generateAISummary(
      contentToSummarize,
      summaryType,
      provider
    );

    // Store the summary
    const summaryId = await ctx.runMutation(internal.memory.summarizer.storeSummary, {
      conversationId: args.conversationId,
      orgId: args.orgId,
      summary: summaryResult.summary,
      summaryType,
      memoryIds: args.memoryIds || [],
      messageCount,
      timeRangeStart,
      timeRangeEnd,
      keyPoints: summaryResult.keyPoints,
      actionItems: summaryResult.actionItems,
      decisions: summaryResult.decisions,
      customerProfile: summaryResult.customerProfile,
      purchaseHistory: summaryResult.purchaseHistory,
      issuesEncountered: summaryResult.issuesEncountered,
      overallSentiment: summaryResult.overallSentiment,
      sentimentScore: summaryResult.sentimentScore,
      generatedBy: provider,
      model: summaryResult.model,
      tokensUsed: summaryResult.tokensUsed,
      costUSD: summaryResult.costUSD,
    });

    return {
      summaryId,
      summary: summaryResult.summary,
      success: true,
    };
  },
});

/**
 * Generate AI summary using OpenAI or Anthropic
 */
async function generateAISummary(
  content: string,
  summaryType: string,
  provider: "openai" | "anthropic"
) {
  const systemPrompt = `You are an expert at analyzing customer support conversations. Generate a comprehensive summary that includes:

1. **Main Summary**: A concise overview of the conversation
2. **Key Points**: Important topics discussed (array of strings)
3. **Action Items**: Tasks or follow-ups needed (array of strings)
4. **Decisions**: Decisions made during the conversation (array of strings)
5. **Customer Profile**: Extract customer information:
   - Name, email, company (if mentioned)
   - Preferences or requirements
   - Pain points or challenges
   - Goals or objectives
6. **Purchase History**: Any products, orders, or purchases mentioned
7. **Issues Encountered**: Problems or issues raised with severity levels
8. **Sentiment Analysis**: Overall sentiment (positive/neutral/negative) and score (-1 to 1)

Respond in JSON format with these exact keys: summary, keyPoints, actionItems, decisions, customerProfile, purchaseHistory, issuesEncountered, overallSentiment, sentimentScore`;

  const userPrompt = `Analyze this ${summaryType} conversation and provide a comprehensive summary:\n\n${content}`;

  try {
    if (provider === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costUSD = calculateOpenAICost("gpt-4o", tokensUsed);

      return {
        summary: result.summary || "",
        keyPoints: result.keyPoints || [],
        actionItems: result.actionItems || [],
        decisions: result.decisions || [],
        customerProfile: result.customerProfile || undefined,
        purchaseHistory: result.purchaseHistory || undefined,
        issuesEncountered: result.issuesEncountered || undefined,
        overallSentiment: result.overallSentiment || "neutral",
        sentimentScore: result.sentimentScore || 0,
        model: "gpt-4o",
        tokensUsed,
        costUSD,
      };
    } else {
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      });

      const content = completion.content[0];
      const text = content.type === "text" ? content.text : "{}";
      const result = JSON.parse(text);
      
      const tokensUsed = completion.usage.input_tokens + completion.usage.output_tokens;
      const costUSD = calculateAnthropicCost("claude-3-5-sonnet-20241022", tokensUsed);

      return {
        summary: result.summary || "",
        keyPoints: result.keyPoints || [],
        actionItems: result.actionItems || [],
        decisions: result.decisions || [],
        customerProfile: result.customerProfile || undefined,
        purchaseHistory: result.purchaseHistory || undefined,
        issuesEncountered: result.issuesEncountered || undefined,
        overallSentiment: result.overallSentiment || "neutral",
        sentimentScore: result.sentimentScore || 0,
        model: "claude-3-5-sonnet-20241022",
        tokensUsed,
        costUSD,
      };
    }
  } catch (error) {
    console.error("Error generating AI summary:", error);
    throw new Error(`Failed to generate summary: ${error}`);
  }
}

/**
 * Calculate OpenAI API costs
 */
function calculateOpenAICost(model: string, tokens: number): number {
  const costs = {
    "gpt-4o": { input: 0.0025, output: 0.01 }, // per 1K tokens
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  };

  const modelCost = costs[model as keyof typeof costs] || costs["gpt-4o"];
  // Approximate 50/50 split for input/output
  return ((tokens / 1000) * (modelCost.input + modelCost.output)) / 2;
}

/**
 * Calculate Anthropic API costs
 */
function calculateAnthropicCost(model: string, tokens: number): number {
  const costs = {
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 }, // per 1K tokens
    "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
    "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
  };

  const modelCost = costs[model as keyof typeof costs] || costs["claude-3-5-sonnet-20241022"];
  // Approximate 50/50 split for input/output
  return ((tokens / 1000) * (modelCost.input + modelCost.output)) / 2;
}

// ─── Internal Queries ──────────────────────────────────────────────────────

export const getConversationContext = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.memory.summarizer.queryConversation, {
      conversationId: args.conversationId,
    });
  },
});

export const queryConversation = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.conversations.get, {
      id: args.conversationId,
    });
  },
});

export const getMemoriesByIds = internalAction({
  args: {
    memoryIds: v.array(v.id("conversation_memories")),
  },
  handler: async (ctx, args) => {
    const memories = [];
    for (const id of args.memoryIds) {
      const memory = await ctx.runQuery(internal.memory.summarizer.queryMemory, { memoryId: id });
      if (memory) memories.push(memory);
    }
    return memories;
  },
});

export const queryMemory = internalAction({
  args: {
    memoryId: v.id("conversation_memories"),
  },
  handler: async (ctx, args) => {
    // This would query the memory - simplified for now
    return null;
  },
});

export const getConversationMessages = internalAction({
  args: {
    conversationId: v.id("conversations"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // This would query messages - simplified for now
    return [];
  },
});

export const storeSummary = mutation({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    summary: v.string(),
    summaryType: v.union(
      v.literal("rolling"),
      v.literal("periodic"),
      v.literal("thematic"),
      v.literal("final")
    ),
    memoryIds: v.array(v.id("conversation_memories")),
    messageCount: v.number(),
    timeRangeStart: v.number(),
    timeRangeEnd: v.number(),
    keyPoints: v.array(v.string()),
    actionItems: v.optional(v.array(v.string())),
    decisions: v.optional(v.array(v.string())),
    customerProfile: v.optional(v.any()),
    purchaseHistory: v.optional(v.any()),
    issuesEncountered: v.optional(v.any()),
    overallSentiment: v.optional(v.string()),
    sentimentScore: v.optional(v.number()),
    generatedBy: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const summaryId = await ctx.db.insert("memory_summaries", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      summary: args.summary,
      summaryType: args.summaryType,
      sourceMemoryIds: args.memoryIds,
      messageCount: args.messageCount,
      timeRangeStart: args.timeRangeStart,
      timeRangeEnd: args.timeRangeEnd,
      keyPoints: args.keyPoints,
      actionItems: args.actionItems,
      decisions: args.decisions,
      customerProfile: args.customerProfile,
      purchaseHistory: args.purchaseHistory,
      issuesEncountered: args.issuesEncountered,
      overallSentiment: args.overallSentiment,
      sentimentScore: args.sentimentScore,
      generatedBy: args.generatedBy,
      model: args.model,
      tokensUsed: args.tokensUsed,
      costUSD: args.costUSD,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    return summaryId;
  },
});

/**
 * Get summaries for a conversation
 */
export const getConversationSummaries = internalAction({
  args: {
    conversationId: v.id("conversations"),
    summaryType: v.optional(v.union(
      v.literal("rolling"),
      v.literal("periodic"),
      v.literal("thematic"),
      v.literal("final")
    )),
  },
  handler: async (ctx, args) => {
    // Implementation would query summaries
    return [];
  },
});

/**
 * Analyze sentiment for a conversation
 */
export const analyzeSentiment = action({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
  },
  handler: async (ctx, args) => {
    const provider = args.provider || "openai";

    // Fetch recent messages
    const messages = await ctx.runQuery(internal.memory.summarizer.getConversationMessages, {
      conversationId: args.conversationId,
      limit: 20,
    });

    const content = messages.map(m => `${m.senderType}: ${m.content}`).join("\n");

    const systemPrompt = `Analyze the sentiment of this customer support conversation. Return a JSON object with:
- sentiment: "positive", "neutral", "negative", or "mixed"
- score: a number from -1 (very negative) to 1 (very positive)
- trend: array of sentiment scores over time
- reasoning: brief explanation`;

    const userPrompt = `Analyze sentiment:\n\n${content}`;

    try {
      if (provider === "openai") {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return result;
      } else {
        const completion = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.2,
        });

        const content = completion.content[0];
        const text = content.type === "text" ? content.text : "{}";
        return JSON.parse(text);
      }
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      throw new Error(`Failed to analyze sentiment: ${error}`);
    }
  },
});
