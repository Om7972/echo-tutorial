/**
 * MemoryManager - Core memory management system
 * Handles creation, storage, and lifecycle of conversation memories
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { generateEmbedding } from "./embeddings";
import { summarizeConversation } from "./summarizer";

/**
 * Store a new short-term memory from messages
 */
export const createShortTermMemory = mutation({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    userId: v.optional(v.string()),
    visitorId: v.optional(v.string()),
    messageIds: v.array(v.id("messages")),
    content: v.string(),
    tokenCount: v.number(),
    metadata: v.optional(v.object({
      sentiment: v.optional(v.string()),
      topics: v.optional(v.array(v.string())),
      entities: v.optional(v.array(v.string())),
      language: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const memoryId = await ctx.db.insert("conversation_memories", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      userId: args.userId,
      visitorId: args.visitorId,
      type: "short_term",
      content: args.content,
      tokenCount: args.tokenCount,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      messageIds: args.messageIds,
      metadata: args.metadata,
    });

    return { memoryId, success: true };
  },
});

/**
 * Convert short-term memories to long-term (summarized) memory
 */
export const convertToLongTerm = mutation({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    shortTermMemoryIds: v.array(v.id("conversation_memories")),
  },
  handler: async (ctx, args) => {
    // Fetch short-term memories
    const memories = await Promise.all(
      args.shortTermMemoryIds.map(id => ctx.db.get(id))
    );

    if (memories.some(m => !m)) {
      throw new Error("One or more memories not found");
    }

    // Combine content for summarization
    const combinedContent = memories
      .filter((m): m is Doc<"conversation_memories"> => m !== null)
      .map(m => m.content)
      .join("\n\n");

    // Create summarization job (will be processed by background worker)
    const jobId = await ctx.db.insert("memory_jobs", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      jobType: "summarize",
      status: "pending",
      progress: 0,
      scheduledAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: "medium",
    });

    return { jobId, success: true };
  },
});

/**
 * Update memory access tracking
 */
export const trackMemoryAccess = internalMutation({
  args: {
    memoryId: v.id("conversation_memories"),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) return;

    await ctx.db.patch(args.memoryId, {
      lastAccessedAt: Date.now(),
      accessCount: memory.accessCount + 1,
    });
  },
});

/**
 * Get memories for a conversation
 */
export const getConversationMemories = query({
  args: {
    conversationId: v.id("conversations"),
    type: v.optional(v.union(
      v.literal("short_term"),
      v.literal("long_term"),
      v.literal("semantic")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("conversation_memories")
      .withIndex("by_conversation_type", q =>
        args.type
          ? q.eq("conversationId", args.conversationId).eq("type", args.type)
          : q.eq("conversationId", args.conversationId)
      )
      .order("desc");

    if (args.limit) {
      query = query.take(args.limit);
    }

    const memories = await query.collect();
    return memories;
  },
});

/**
 * Get memory statistics for an organization
 */
export const getMemoryStats = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    const shortTerm = memories.filter(m => m.type === "short_term").length;
    const longTerm = memories.filter(m => m.type === "long_term").length;
    const semantic = memories.filter(m => m.type === "semantic").length;
    const totalTokens = memories.reduce((sum, m) => sum + m.tokenCount, 0);

    return {
      total: memories.length,
      shortTerm,
      longTerm,
      semantic,
      totalTokens,
    };
  },
});

/**
 * Expire old memories based on configuration
 */
export const expireMemories = internalMutation({
  args: {
    orgId: v.string(),
    beforeTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const expiredMemories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_expires_at")
      .filter(q =>
        q.and(
          q.eq(q.field("orgId"), args.orgId),
          q.lt(q.field("expiresAt"), args.beforeTimestamp)
        )
      )
      .collect();

    let deletedCount = 0;
    for (const memory of expiredMemories) {
      await ctx.db.delete(memory._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Update memory relevance scores (decay over time)
 */
export const updateRelevanceScores = internalMutation({
  args: {
    orgId: v.string(),
    decayFactor: v.number(), // e.g., 0.95 for 5% decay
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("conversation_memories")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q => q.neq(q.field("relevanceScore"), undefined))
      .collect();

    let updatedCount = 0;
    for (const memory of memories) {
      if (memory.relevanceScore !== undefined) {
        const newScore = memory.relevanceScore * args.decayFactor;
        await ctx.db.patch(memory._id, {
          relevanceScore: newScore,
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});

/**
 * Delete a memory and its associated data
 */
export const deleteMemory = mutation({
  args: {
    memoryId: v.id("conversation_memories"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    
    if (!memory || memory.orgId !== args.orgId) {
      throw new Error("Memory not found or access denied");
    }

    // Delete associated chunks
    const chunks = await ctx.db
      .query("memory_chunks")
      .withIndex("by_memory_id", q => q.eq("memoryId", args.memoryId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete associated embeddings
    const embeddings = await ctx.db
      .query("memory_embeddings")
      .withIndex("by_memory_id", q => q.eq("memoryId", args.memoryId))
      .collect();

    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }

    // Delete the memory itself
    await ctx.db.delete(args.memoryId);

    return { success: true };
  },
});

/**
 * Consolidate multiple memories into one
 */
export const consolidateMemories = mutation({
  args: {
    memoryIds: v.array(v.id("conversation_memories")),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.memoryIds.length < 2) {
      throw new Error("Need at least 2 memories to consolidate");
    }

    const memories = await Promise.all(
      args.memoryIds.map(id => ctx.db.get(id))
    );

    if (memories.some(m => !m || m.orgId !== args.orgId)) {
      throw new Error("Invalid memories or access denied");
    }

    const validMemories = memories.filter((m): m is Doc<"conversation_memories"> => m !== null);
    const conversationId = validMemories[0].conversationId;

    // Create consolidation job
    const jobId = await ctx.db.insert("memory_jobs", {
      orgId: args.orgId,
      conversationId,
      jobType: "consolidate",
      status: "pending",
      progress: 0,
      scheduledAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: "low",
    });

    return { jobId };
  },
});
