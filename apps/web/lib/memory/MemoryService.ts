/**
 * Memory Service - Client-side wrapper for memory operations
 * Provides a clean API for interacting with the memory system from Next.js
 */

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

/**
 * Hook for memory management operations
 */
export function useMemoryManager(orgId: string) {
  const createMemory = useMutation(api.memory.manager.createShortTermMemory);
  const getMemories = useQuery(api.memory.manager.getConversationMemories);
  const deleteMemory = useMutation(api.memory.manager.deleteMemory);
  const getStats = useQuery(api.memory.manager.getMemoryStats, { orgId });

  return {
    /**
     * Create a new short-term memory from messages
     */
    async createShortTerm(params: {
      conversationId: Id<"conversations">;
      userId?: string;
      visitorId?: string;
      messageIds: Id<"messages">[];
      content: string;
      tokenCount: number;
      metadata?: {
        sentiment?: string;
        topics?: string[];
        entities?: string[];
        language?: string;
      };
    }) {
      return await createMemory({
        ...params,
        orgId,
      });
    },

    /**
     * Get memories for a conversation
     */
    getConversationMemories(
      conversationId: Id<"conversations">,
      options?: {
        type?: "short_term" | "long_term" | "semantic";
        limit?: number;
      }
    ) {
      return getMemories
        ? getMemories({
            conversationId,
            type: options?.type,
            limit: options?.limit,
          })
        : null;
    },

    /**
     * Delete a memory
     */
    async delete(memoryId: Id<"conversation_memories">) {
      return await deleteMemory({
        memoryId,
        orgId,
      });
    },

    /**
     * Get memory statistics
     */
    stats: getStats,
  };
}

/**
 * Hook for memory retrieval operations
 */
export function useMemoryRetriever(
  conversationId: Id<"conversations">,
  orgId: string
) {
  const retrieveRecent = useQuery(api.memory.retriever.retrieveByRecency);
  const retrieveHybrid = useQuery(api.memory.retriever.retrieveHybrid);
  const retrieveContextRanked = useQuery(api.memory.retriever.retrieveContextRanked);
  const searchAction = useAction(api.memory.embeddings.searchBySimilarity);

  return {
    /**
     * Get recent memories
     */
    recent(limit: number = 10) {
      return retrieveRecent
        ? retrieveRecent({
            conversationId,
            orgId,
            limit,
          })
        : null;
    },

    /**
     * Hybrid retrieval (recency + semantic)
     */
    hybrid(query: string, options?: { limit?: number; recencyWeight?: number; semanticWeight?: number }) {
      return retrieveHybrid
        ? retrieveHybrid({
            conversationId,
            orgId,
            query,
            limit: options?.limit,
            recencyWeight: options?.recencyWeight,
            semanticWeight: options?.semanticWeight,
          })
        : null;
    },

    /**
     * Context-ranked retrieval
     */
    contextRanked(keywords: string[], limit: number = 10) {
      return retrieveContextRanked
        ? retrieveContextRanked({
            conversationId,
            orgId,
            contextKeywords: keywords,
            limit,
          })
        : null;
    },

    /**
     * Semantic search across all memories
     */
    async semanticSearch(query: string, options?: { limit?: number; minScore?: number }) {
      return await searchAction({
        orgId,
        query,
        conversationId,
        limit: options?.limit,
        minScore: options?.minScore,
      });
    },
  };
}

/**
 * Hook for summarization operations
 */
export function useMemorySummarizer() {
  const summarize = useAction(api.memory.summarizer.summarizeConversation);
  const analyzeSentiment = useAction(api.memory.summarizer.analyzeSentiment);

  return {
    /**
     * Generate a conversation summary
     */
    async summarize(params: {
      conversationId: Id<"conversations">;
      orgId: string;
      memoryIds?: Id<"conversation_memories">[];
      summaryType?: "rolling" | "periodic" | "thematic" | "final";
      provider?: "openai" | "anthropic";
    }) {
      return await summarize(params);
    },

    /**
     * Analyze sentiment of a conversation
     */
    async analyzeSentiment(params: {
      conversationId: Id<"conversations">;
      orgId: string;
      provider?: "openai" | "anthropic";
    }) {
      return await analyzeSentiment(params);
    },
  };
}

/**
 * Hook for embeddings operations
 */
export function useMemoryEmbeddings() {
  const generateEmbedding = useAction(api.memory.embeddings.generateMemoryEmbedding);
  const batchGenerate = useAction(api.memory.embeddings.batchGenerateEmbeddings);

  return {
    /**
     * Generate embedding for a single memory
     */
    async generate(
      memoryId: Id<"conversation_memories">,
      model?: "text-embedding-3-small" | "text-embedding-3-large"
    ) {
      return await generateEmbedding({ memoryId, model });
    },

    /**
     * Batch generate embeddings
     */
    async batchGenerate(
      memoryIds: Id<"conversation_memories">[],
      model?: "text-embedding-3-small" | "text-embedding-3-large"
    ) {
      return await batchGenerate({ memoryIds, model });
    },
  };
}

/**
 * Hook for analytics operations
 */
export function useMemoryAnalytics(orgId: string) {
  const analytics = useQuery(api.memory.analytics.getMemoryAnalytics);
  const costBreakdown = useQuery(api.memory.analytics.getCostBreakdown);
  const usageTrends = useQuery(api.memory.analytics.getUsageTrends);
  const healthScore = useQuery(api.memory.analytics.getMemoryHealthScore, { orgId });
  const topMemories = useQuery(api.memory.analytics.getTopMemories, { orgId });

  return {
    /**
     * Get comprehensive analytics
     */
    getAnalytics(dateRange?: { startDate?: string; endDate?: string }) {
      return analytics
        ? analytics({
            orgId,
            startDate: dateRange?.startDate,
            endDate: dateRange?.endDate,
          })
        : null;
    },

    /**
     * Get cost breakdown
     */
    getCostBreakdown(dateRange?: { startDate?: string; endDate?: string }) {
      return costBreakdown
        ? costBreakdown({
            orgId,
            startDate: dateRange?.startDate,
            endDate: dateRange?.endDate,
          })
        : null;
    },

    /**
     * Get usage trends
     */
    getUsageTrends(days: number = 30) {
      return usageTrends
        ? usageTrends({
            orgId,
            days,
          })
        : null;
    },

    /**
     * Get memory health score
     */
    healthScore,

    /**
     * Get top accessed memories
     */
    topMemories,
  };
}

/**
 * Client-side Memory Service Class
 * For use in API routes and server components
 */
export class MemoryService {
  constructor(private orgId: string) {}

  /**
   * Create a short-term memory from messages
   */
  async createMemoryFromMessages(
    conversationId: Id<"conversations">,
    messages: Array<{ id: Id<"messages">; content: string }>,
    metadata?: {
      sentiment?: string;
      topics?: string[];
      entities?: string[];
    }
  ) {
    const content = messages.map(m => m.content).join("\n");
    const tokenCount = this.estimateTokens(content);

    return {
      conversationId,
      orgId: this.orgId,
      messageIds: messages.map(m => m.id),
      content,
      tokenCount,
      metadata,
    };
  }

  /**
   * Extract keywords from text for context-ranked retrieval
   */
  extractKeywords(text: string): string[] {
    // Simple keyword extraction (in production, use NLP library)
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    ]);

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 10);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate memory priority based on content
   */
  calculatePriority(memory: {
    accessCount: number;
    relevanceScore?: number;
    lastAccessedAt: number;
  }): "high" | "medium" | "low" {
    const daysSinceAccess = (Date.now() - memory.lastAccessedAt) / (24 * 60 * 60 * 1000);
    
    if (memory.accessCount > 10 && daysSinceAccess < 7) {
      return "high";
    }
    
    if (memory.accessCount > 5 || (memory.relevanceScore ?? 0) > 0.7) {
      return "medium";
    }
    
    return "low";
  }

  /**
   * Determine if memories should be consolidated
   */
  shouldConsolidate(memories: Array<{ createdAt: number; type: string }>): boolean {
    const shortTermMemories = memories.filter(m => m.type === "short_term");
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldMemories = shortTermMemories.filter(m => m.createdAt < sevenDaysAgo);

    return oldMemories.length >= 10;
  }
}

/**
 * Helper function to format memory for display
 */
export function formatMemoryPreview(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }

  return content.substring(0, maxLength) + "...";
}

/**
 * Helper function to format cost as currency
 */
export function formatCost(costUSD: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(costUSD);
}

/**
 * Helper function to calculate cost savings
 */
export function calculateSavings(
  currentCost: number,
  previousCost: number
): { amount: number; percentage: number } {
  const amount = previousCost - currentCost;
  const percentage = previousCost > 0 ? (amount / previousCost) * 100 : 0;

  return { amount, percentage };
}
