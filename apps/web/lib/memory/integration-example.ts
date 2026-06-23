/**
 * Integration Example - How to use the Memory System in your application
 * This file demonstrates best practices for integrating memory into conversations
 */

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

/**
 * Example: Creating memories from new messages
 */
export async function createMemoryFromNewMessages(
  client: ConvexHttpClient,
  params: {
    conversationId: Id<"conversations">;
    orgId: string;
    userId?: string;
    visitorId?: string;
    messages: Array<{
      id: Id<"messages">;
      content: string;
      senderType: string;
    }>;
  }
) {
  // Combine messages into memory content
  const content = params.messages
    .map(m => `${m.senderType}: ${m.content}`)
    .join("\n");

  // Estimate token count (rough approximation: 1 token ≈ 4 chars)
  const tokenCount = Math.ceil(content.length / 4);

  // Extract basic metadata (in production, use NLP libraries)
  const metadata = {
    topics: extractTopics(content),
    entities: extractEntities(content),
    sentiment: detectSentiment(content),
  };

  // Create the memory
  const result = await client.mutation(api.memory.manager.createShortTermMemory, {
    conversationId: params.conversationId,
    orgId: params.orgId,
    userId: params.userId,
    visitorId: params.visitorId,
    messageIds: params.messages.map(m => m.id),
    content,
    tokenCount,
    metadata,
  });

  // Schedule embedding generation for better semantic search
  if (result.success) {
    await client.action(api.memory.embeddings.generateMemoryEmbedding, {
      memoryId: result.memoryId,
      model: "text-embedding-3-small",
    });
  }

  return result;
}

/**
 * Example: Retrieving relevant context for AI responses
 */
export async function getRelevantContext(
  client: ConvexHttpClient,
  params: {
    conversationId: Id<"conversations">;
    orgId: string;
    currentQuery: string;
    limit?: number;
  }
) {
  // Use hybrid retrieval for balanced results
  const memories = await client.query(api.memory.retriever.retrieveHybrid, {
    conversationId: params.conversationId,
    orgId: params.orgId,
    query: params.currentQuery,
    limit: params.limit || 5,
    recencyWeight: 0.6,
    semanticWeight: 0.4,
  });

  // Format for AI context
  const context = memories
    .map((m, i) => `[Memory ${i + 1}] ${m.content}`)
    .join("\n\n");

  return {
    context,
    memories,
  };
}

/**
 * Example: Periodic summarization trigger
 */
export async function checkAndSummarize(
  client: ConvexHttpClient,
  params: {
    conversationId: Id<"conversations">;
    orgId: string;
  }
) {
  // Get conversation memories
  const memories = await client.query(api.memory.manager.getConversationMemories, {
    conversationId: params.conversationId,
    type: "short_term",
  });

  // If we have 50+ short-term memories, trigger summarization
  if (memories && memories.length >= 50) {
    const summary = await client.action(api.memory.summarizer.summarizeConversation, {
      conversationId: params.conversationId,
      orgId: params.orgId,
      summaryType: "periodic",
      provider: "openai",
    });

    // Convert to long-term memory
    await client.mutation(api.memory.manager.convertToLongTerm, {
      conversationId: params.conversationId,
      orgId: params.orgId,
      shortTermMemoryIds: memories.slice(0, 50).map(m => m._id),
    });

    return summary;
  }

  return null;
}

/**
 * Example: Search customer history across conversations
 */
export async function searchCustomerHistory(
  client: ConvexHttpClient,
  params: {
    orgId: string;
    searchQuery: string;
    limit?: number;
  }
) {
  return await client.query(api.memory.retriever.searchMemories, {
    orgId: params.orgId,
    searchTerm: params.searchQuery,
    limit: params.limit || 20,
  });
}

/**
 * Example: Get customer insights for agent
 */
export async function getCustomerInsights(
  client: ConvexHttpClient,
  params: {
    conversationId: Id<"conversations">;
    orgId: string;
  }
) {
  // Get latest summary
  const summaries = await client.action(api.memory.summarizer.getConversationSummaries, {
    conversationId: params.conversationId,
  });

  if (!summaries || summaries.length === 0) {
    return null;
  }

  const latestSummary = summaries[0];

  return {
    customerProfile: latestSummary.customerProfile,
    purchaseHistory: latestSummary.purchaseHistory,
    issuesEncountered: latestSummary.issuesEncountered,
    overallSentiment: latestSummary.overallSentiment,
    keyPoints: latestSummary.keyPoints,
  };
}

/**
 * Example: Monitoring memory costs
 */
export async function getMemoryCostReport(
  client: ConvexHttpClient,
  params: {
    orgId: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const analytics = await client.query(api.memory.analytics.getMemoryAnalytics, {
    orgId: params.orgId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const costBreakdown = await client.query(api.memory.analytics.getCostBreakdown, {
    orgId: params.orgId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  return {
    totalCost: analytics?.totals.totalCostUSD || 0,
    summarizationCost: costBreakdown?.breakdown.summarization.cost || 0,
    embeddingCost: costBreakdown?.breakdown.embeddings.cost || 0,
    avgCostPerDay: analytics?.averages.avgCostPerDay || 0,
    totalMemories: analytics?.totals.totalMemories || 0,
  };
}

/**
 * Example: Health check and recommendations
 */
export async function performHealthCheck(
  client: ConvexHttpClient,
  orgId: string
) {
  const healthScore = await client.query(api.memory.analytics.getMemoryHealthScore, {
    orgId,
  });

  const stats = await client.query(api.memory.manager.getMemoryStats, {
    orgId,
  });

  return {
    score: healthScore?.score || 0,
    grade: healthScore?.grade || "N/A",
    issues: healthScore?.issues || [],
    recommendations: healthScore?.recommendations || [],
    stats,
  };
}

/**
 * Example: React Hook for conversation with memory
 */
export function useConversationWithMemory(
  conversationId: Id<"conversations">,
  orgId: string
) {
  const [memoryContext, setMemoryContext] = useState<string>("");
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Load relevant context when query changes
  const loadContext = async (query: string) => {
    setIsLoadingContext(true);
    try {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      const { context } = await getRelevantContext(client, {
        conversationId,
        orgId,
        currentQuery: query,
        limit: 5,
      });
      setMemoryContext(context);
    } catch (error) {
      console.error("Error loading memory context:", error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // Save new messages to memory
  const saveToMemory = async (messages: any[]) => {
    try {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      await createMemoryFromNewMessages(client, {
        conversationId,
        orgId,
        messages,
      });
    } catch (error) {
      console.error("Error saving to memory:", error);
    }
  };

  return {
    memoryContext,
    isLoadingContext,
    loadContext,
    saveToMemory,
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function extractTopics(text: string): string[] {
  // Simple topic extraction (in production, use NLP)
  const keywords = [
    "pricing", "billing", "subscription", "support", "bug", "feature",
    "account", "login", "password", "payment", "refund", "cancel",
  ];

  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword));
}

function extractEntities(text: string): string[] {
  // Simple entity extraction (in production, use NER)
  const entities: string[] = [];
  
  // Extract emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  if (emails) entities.push(...emails);

  // Extract capitalized words (potential names)
  const nameRegex = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
  const names = text.match(nameRegex);
  if (names) entities.push(...names.slice(0, 5));

  return [...new Set(entities)];
}

function detectSentiment(text: string): string {
  // Simple sentiment detection (in production, use sentiment analysis API)
  const positiveWords = ["good", "great", "excellent", "thank", "thanks", "happy", "love"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "angry", "frustrated", "issue"];

  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

import { useState } from "react";
