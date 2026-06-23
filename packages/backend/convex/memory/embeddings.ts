/**
 * Embeddings generation and management for semantic memory search
 */

import { v } from "convex/values";
import { action, internalAction, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(
  text: string,
  model: "text-embedding-3-small" | "text-embedding-3-large" = "text-embedding-3-small"
): Promise<{ embedding: number[]; dimensions: number; tokensUsed: number; costUSD: number }> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: text,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;
    const dimensions = embedding.length;
    const tokensUsed = response.usage.total_tokens;

    // Calculate cost
    const costs = {
      "text-embedding-3-small": 0.00002, // per 1K tokens
      "text-embedding-3-large": 0.00013,
    };
    const costUSD = (tokensUsed / 1000) * costs[model];

    return {
      embedding,
      dimensions,
      tokensUsed,
      costUSD,
    };
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate and store embedding for a memory
 */
export const generateMemoryEmbedding = action({
  args: {
    memoryId: v.id("conversation_memories"),
    model: v.optional(v.union(
      v.literal("text-embedding-3-small"),
      v.literal("text-embedding-3-large")
    )),
  },
  handler: async (ctx, args) => {
    const model = args.model || "text-embedding-3-small";

    // Fetch the memory
    const memory = await ctx.runQuery(internal.memory.embeddings.getMemory, {
      memoryId: args.memoryId,
    });

    if (!memory) {
      throw new Error("Memory not found");
    }

    // Generate embedding
    const { embedding, dimensions, tokensUsed, costUSD } = await generateEmbedding(
      memory.content,
      model
    );

    // Store the embedding
    const embeddingId = await ctx.runMutation(internal.memory.embeddings.storeEmbedding, {
      memoryId: args.memoryId,
      conversationId: memory.conversationId,
      orgId: memory.orgId,
      embedding,
      model,
      dimensions,
      sourceText: memory.content.substring(0, 500), // Store first 500 chars for context
    });

    // Update analytics
    await ctx.runMutation(internal.memory.embeddings.updateEmbeddingAnalytics, {
      orgId: memory.orgId,
      tokensUsed,
      costUSD,
    });

    return {
      embeddingId,
      dimensions,
      tokensUsed,
      costUSD,
      success: true,
    };
  },
});

/**
 * Batch generate embeddings for multiple memories
 */
export const batchGenerateEmbeddings = action({
  args: {
    memoryIds: v.array(v.id("conversation_memories")),
    model: v.optional(v.union(
      v.literal("text-embedding-3-small"),
      v.literal("text-embedding-3-large")
    )),
  },
  handler: async (ctx, args) => {
    const model = args.model || "text-embedding-3-small";
    const results = [];
    let totalTokens = 0;
    let totalCost = 0;

    for (const memoryId of args.memoryIds) {
      try {
        const result = await ctx.runAction(internal.memory.embeddings.generateMemoryEmbedding, {
          memoryId,
          model,
        });
        
        results.push({ memoryId, success: true, embeddingId: result.embeddingId });
        totalTokens += result.tokensUsed;
        totalCost += result.costUSD;
      } catch (error) {
        results.push({
          memoryId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      results,
      totalTokens,
      totalCost,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
    };
  },
});

/**
 * Generate embedding for a memory chunk
 */
export const generateChunkEmbedding = action({
  args: {
    chunkId: v.id("memory_chunks"),
    model: v.optional(v.union(
      v.literal("text-embedding-3-small"),
      v.literal("text-embedding-3-large")
    )),
  },
  handler: async (ctx, args) => {
    const model = args.model || "text-embedding-3-small";

    // Fetch the chunk
    const chunk = await ctx.runQuery(internal.memory.embeddings.getChunk, {
      chunkId: args.chunkId,
    });

    if (!chunk) {
      throw new Error("Chunk not found");
    }

    // Generate embedding
    const { embedding, dimensions, tokensUsed, costUSD } = await generateEmbedding(
      chunk.text,
      model
    );

    // Store the embedding
    const embeddingId = await ctx.runMutation(internal.memory.embeddings.storeEmbedding, {
      memoryId: chunk.memoryId,
      chunkId: args.chunkId,
      conversationId: chunk.conversationId,
      orgId: chunk.orgId,
      embedding,
      model,
      dimensions,
      sourceText: chunk.text.substring(0, 500),
    });

    return {
      embeddingId,
      dimensions,
      tokensUsed,
      costUSD,
      success: true,
    };
  },
});

/**
 * Search memories by semantic similarity
 */
export const searchBySimilarity = action({
  args: {
    orgId: v.string(),
    query: v.string(),
    conversationId: v.optional(v.id("conversations")),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const minScore = args.minScore || 0.7;

    // Generate embedding for the query
    const { embedding } = await generateEmbedding(args.query);

    // Search for similar embeddings
    const results = await ctx.runQuery(internal.memory.embeddings.vectorSearch, {
      orgId: args.orgId,
      queryEmbedding: embedding,
      conversationId: args.conversationId,
      limit: limit * 2, // Get more for filtering
    });

    // Filter by minimum score and return top results
    const filtered = results
      .filter(r => r.score >= minScore)
      .slice(0, limit);

    return {
      results: filtered,
      totalResults: filtered.length,
    };
  },
});

// ─── Internal Mutations and Queries ─────────────────────────────────────────

export const getMemory = internalAction({
  args: {
    memoryId: v.id("conversation_memories"),
  },
  handler: async (ctx, args) => {
    // Implementation would fetch memory from database
    return null;
  },
});

export const getChunk = internalAction({
  args: {
    chunkId: v.id("memory_chunks"),
  },
  handler: async (ctx, args) => {
    // Implementation would fetch chunk from database
    return null;
  },
});

export const storeEmbedding = mutation({
  args: {
    memoryId: v.id("conversation_memories"),
    chunkId: v.optional(v.id("memory_chunks")),
    conversationId: v.id("conversations"),
    orgId: v.string(),
    embedding: v.array(v.float64()),
    model: v.string(),
    dimensions: v.number(),
    sourceText: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const embeddingId = await ctx.db.insert("memory_embeddings", {
      memoryId: args.memoryId,
      chunkId: args.chunkId,
      conversationId: args.conversationId,
      orgId: args.orgId,
      embedding: args.embedding,
      model: args.model,
      dimensions: args.dimensions,
      sourceText: args.sourceText,
      createdAt: now,
      useCount: 0,
    });

    return embeddingId;
  },
});

export const updateEmbeddingAnalytics = mutation({
  args: {
    orgId: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    // Check if analytics record exists for today
    const existing = await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embeddingsGenerated: existing.embeddingsGenerated + 1,
        totalEmbeddings: existing.totalEmbeddings + 1,
        embeddingCostUSD: existing.embeddingCostUSD + args.costUSD,
        totalCostUSD: existing.totalCostUSD + args.costUSD,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("memory_analytics", {
        orgId: args.orgId,
        date: today,
        totalMemories: 0,
        shortTermMemories: 0,
        longTermMemories: 0,
        semanticMemories: 0,
        totalTokens: 0,
        totalEmbeddings: 1,
        summarizationsCompleted: 0,
        embeddingsGenerated: 1,
        memoriesExpired: 0,
        totalCostUSD: args.costUSD,
        summarizationCostUSD: 0,
        embeddingCostUSD: args.costUSD,
        avgRetrievalTimeMs: 0,
        totalRetrievals: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const vectorSearch = internalAction({
  args: {
    orgId: v.string(),
    queryEmbedding: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation would perform vector search using Convex vector index
    // This is a placeholder - actual implementation needs Convex vector search API
    return [];
  },
});

/**
 * Update embedding usage tracking
 */
export const trackEmbeddingUsage = mutation({
  args: {
    embeddingId: v.id("memory_embeddings"),
  },
  handler: async (ctx, args) => {
    const embedding = await ctx.db.get(args.embeddingId);
    if (!embedding) return;

    await ctx.db.patch(args.embeddingId, {
      lastUsedAt: Date.now(),
      useCount: embedding.useCount + 1,
    });
  },
});

/**
 * Delete embeddings for a memory
 */
export const deleteMemoryEmbeddings = mutation({
  args: {
    memoryId: v.id("conversation_memories"),
  },
  handler: async (ctx, args) => {
    const embeddings = await ctx.db
      .query("memory_embeddings")
      .withIndex("by_memory_id", q => q.eq("memoryId", args.memoryId))
      .collect();

    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }

    return { deletedCount: embeddings.length };
  },
});

/**
 * Get embedding statistics for an organization
 */
export const getEmbeddingStats = internalAction({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation would query embedding statistics
    return {
      totalEmbeddings: 0,
      averageDimensions: 0,
      totalCost: 0,
      modelsUsed: [],
    };
  },
});
