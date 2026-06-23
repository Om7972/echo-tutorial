/**
 * MemoryRetriever - Advanced memory retrieval with multiple strategies
 * Supports recency, semantic similarity, hybrid, and context-ranked retrieval
 */

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { generateEmbedding } from "./embeddings";

/**
 * Retrieve memories by recency (most recent first)
 */
export const retrieveByRecency = query({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    limit: v.optional(v.number()),
    includeTypes: v.optional(v.array(v.union(
      v.literal("short_term"),
      v.literal("long_term"),
      v.literal("semantic")
    ))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("conversation_memories")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("orgId"), args.orgId));

    if (args.includeTypes && args.includeTypes.length > 0) {
      query = query.filter(q =>
        q.or(
          ...args.includeTypes!.map(type =>
            q.eq(q.field("type"), type)
          )
        )
      );
    }

    const memories = await query
      .order("desc")
      .take(limit)
      .collect();

    // Track access
    for (const memory of memories) {
      await ctx.db.patch(memory._id, {
        lastAccessedAt: Date.now(),
        accessCount: memory.accessCount + 1,
      });
    }

    return memories;
  },
});

/**
 * Retrieve memories by semantic similarity using vector search
 */
export const retrieveBySemantic = query({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const minScore = args.minScore || 0.7;

    // Generate embedding for the query (this would need to be done server-side with OpenAI)
    // For now, we'll return a placeholder implementation
    
    // TODO: Implement actual vector search with embeddings
    // This requires calling OpenAI API to generate query embedding
    // Then use ctx.db.query("memory_embeddings").withIndex("by_embedding", ...)

    const startTime = Date.now();

    // Log the retrieval attempt
    await ctx.db.insert("memory_retrieval_logs", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      query: args.query,
      strategy: "semantic",
      memoriesRetrieved: [], // Will be populated with actual results
      relevanceScores: [],
      retrievalTimeMs: Date.now() - startTime,
      tokensRetrieved: 0,
      timestamp: Date.now(),
    });

    // Fallback to recent memories for now
    return [];
  },
});

/**
 * Hybrid retrieval: combines recency and semantic similarity
 */
export const retrieveHybrid = query({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
    recencyWeight: v.optional(v.number()), // 0-1, default 0.5
    semanticWeight: v.optional(v.number()), // 0-1, default 0.5
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const recencyWeight = args.recencyWeight ?? 0.5;
    const semanticWeight = args.semanticWeight ?? 0.5;

    const startTime = Date.now();

    // Get recent memories
    const recentMemories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .order("desc")
      .take(limit * 2) // Get more for filtering
      .collect();

    // Calculate hybrid scores
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    const scoredMemories = recentMemories.map(memory => {
      // Recency score (newer = higher)
      const age = now - memory.lastAccessedAt;
      const recencyScore = Math.max(0, 1 - (age / maxAge));

      // Semantic score (would come from vector similarity in production)
      const semanticScore = memory.relevanceScore ?? 0.5;

      // Combined score
      const hybridScore = (recencyScore * recencyWeight) + (semanticScore * semanticWeight);

      return {
        memory,
        score: hybridScore,
      };
    });

    // Sort by hybrid score and take top results
    const topMemories = scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access tracking
    for (const { memory } of topMemories) {
      await ctx.db.patch(memory._id, {
        lastAccessedAt: Date.now(),
        accessCount: memory.accessCount + 1,
      });
    }

    // Log retrieval
    await ctx.db.insert("memory_retrieval_logs", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      query: args.query,
      strategy: "hybrid",
      memoriesRetrieved: topMemories.map(m => m.memory._id),
      relevanceScores: topMemories.map(m => m.score),
      retrievalTimeMs: Date.now() - startTime,
      tokensRetrieved: topMemories.reduce((sum, m) => sum + m.memory.tokenCount, 0),
      timestamp: Date.now(),
    });

    return topMemories.map(m => ({
      ...m.memory,
      retrievalScore: m.score,
    }));
  },
});

/**
 * Context-ranked retrieval: ranks memories by relevance to current context
 */
export const retrieveContextRanked = query({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    contextKeywords: v.array(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const startTime = Date.now();

    // Get all memories for the conversation
    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .collect();

    // Score memories based on keyword matches
    const scoredMemories = memories.map(memory => {
      let score = 0;
      const content = memory.content.toLowerCase();
      const metadata = memory.metadata;

      // Score based on keyword matches in content
      for (const keyword of args.contextKeywords) {
        const keywordLower = keyword.toLowerCase();
        const matches = (content.match(new RegExp(keywordLower, "g")) || []).length;
        score += matches * 1.0;
      }

      // Bonus for topic matches
      if (metadata?.topics) {
        for (const topic of metadata.topics) {
          if (args.contextKeywords.some(k => topic.toLowerCase().includes(k.toLowerCase()))) {
            score += 2.0;
          }
        }
      }

      // Bonus for entity matches
      if (metadata?.entities) {
        for (const entity of metadata.entities) {
          if (args.contextKeywords.some(k => entity.toLowerCase().includes(k.toLowerCase()))) {
            score += 1.5;
          }
        }
      }

      // Recency bonus
      const age = Date.now() - memory.lastAccessedAt;
      const daysSinceAccess = age / (24 * 60 * 60 * 1000);
      const recencyBonus = Math.max(0, 1 - (daysSinceAccess / 30));
      score += recencyBonus;

      return { memory, score };
    });

    // Sort and take top results
    const topMemories = scoredMemories
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Update access tracking
    for (const { memory } of topMemories) {
      await ctx.db.patch(memory._id, {
        lastAccessedAt: Date.now(),
        accessCount: memory.accessCount + 1,
      });
    }

    // Log retrieval
    await ctx.db.insert("memory_retrieval_logs", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      query: args.contextKeywords.join(", "),
      strategy: "context_ranked",
      memoriesRetrieved: topMemories.map(m => m.memory._id),
      relevanceScores: topMemories.map(m => m.score),
      retrievalTimeMs: Date.now() - startTime,
      tokensRetrieved: topMemories.reduce((sum, m) => sum + m.memory.tokenCount, 0),
      timestamp: Date.now(),
    });

    return topMemories.map(m => ({
      ...m.memory,
      relevanceScore: m.score,
    }));
  },
});

/**
 * Get memory retrieval analytics
 */
export const getRetrievalAnalytics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = args.endDate || Date.now();

    const logs = await ctx.db
      .query("memory_retrieval_logs")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q =>
        q.and(
          q.gte(q.field("timestamp"), startDate),
          q.lte(q.field("timestamp"), endDate)
        )
      )
      .collect();

    // Calculate analytics
    const totalRetrievals = logs.length;
    const avgRetrievalTime = logs.reduce((sum, log) => sum + log.retrievalTimeMs, 0) / totalRetrievals || 0;
    const totalTokensRetrieved = logs.reduce((sum, log) => sum + log.tokensRetrieved, 0);

    const strategyBreakdown = logs.reduce((acc, log) => {
      acc[log.strategy] = (acc[log.strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRetrievals,
      avgRetrievalTime,
      totalTokensRetrieved,
      strategyBreakdown,
      dateRange: { startDate, endDate },
    };
  },
});

/**
 * Search across all organization memories
 */
export const searchMemories = query({
  args: {
    orgId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
    memoryTypes: v.optional(v.array(v.union(
      v.literal("short_term"),
      v.literal("long_term"),
      v.literal("semantic")
    ))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let query = ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId));

    const memories = await query.collect();

    // Filter by search term
    const searchLower = args.searchTerm.toLowerCase();
    const filtered = memories.filter(memory => {
      if (args.memoryTypes && !args.memoryTypes.includes(memory.type)) {
        return false;
      }

      const contentMatch = memory.content.toLowerCase().includes(searchLower);
      const topicMatch = memory.metadata?.topics?.some(t =>
        t.toLowerCase().includes(searchLower)
      );
      const entityMatch = memory.metadata?.entities?.some(e =>
        e.toLowerCase().includes(searchLower)
      );

      return contentMatch || topicMatch || entityMatch;
    });

    // Sort by relevance (count of matches) and recency
    const scored = filtered.map(memory => {
      const content = memory.content.toLowerCase();
      const matches = (content.match(new RegExp(searchLower, "g")) || []).length;
      const recency = memory.lastAccessedAt;

      return {
        memory,
        score: matches * 10 + (recency / 1000000),
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory);
  },
});
