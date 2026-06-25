// @ts-nocheck
/**
 * Background job processing for memory operations
 * Handles summarization, embedding generation, expiration, and consolidation
 */

import { v } from "convex/values";
import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Process pending memory jobs
 */
export const processJobs = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;

    // Get pending jobs ordered by priority and scheduled time
    const pendingJobs = await ctx.runQuery(internal.memory.jobs.getPendingJobs, {
      limit: batchSize,
    });

    const results = [];

    for (const job of pendingJobs) {
      try {
        // Mark job as running
        await ctx.runMutation(internal.memory.jobs.updateJobStatus, {
          jobId: job._id,
          status: "running",
          startedAt: Date.now(),
        });

        // Process based on job type
        let result;
        switch (job.jobType) {
          case "summarize":
            result = await processSummarizeJob(ctx, job);
            break;
          case "generate_embeddings":
            result = await processEmbeddingsJob(ctx, job);
            break;
          case "expire_memories":
            result = await processExpireJob(ctx, job);
            break;
          case "consolidate":
            result = await processConsolidateJob(ctx, job);
            break;
          case "analyze_sentiment":
            result = await processSentimentJob(ctx, job);
            break;
          default:
            throw new Error(`Unknown job type: ${job.jobType}`);
        }

        // Mark job as completed
        await ctx.runMutation(internal.memory.jobs.updateJobStatus, {
          jobId: job._id,
          status: "completed",
          completedAt: Date.now(),
          result,
        });

        results.push({ jobId: job._id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if we should retry
        if (job.retryCount < job.maxRetries) {
          await ctx.runMutation(internal.memory.jobs.retryJob, {
            jobId: job._id,
            error: errorMessage,
          });
          results.push({ jobId: job._id, success: false, retrying: true });
        } else {
          await ctx.runMutation(internal.memory.jobs.updateJobStatus, {
            jobId: job._id,
            status: "failed",
            completedAt: Date.now(),
            error: errorMessage,
          });
          results.push({ jobId: job._id, success: false, retrying: false });
        }
      }
    }

    return {
      processedCount: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  },
});

/**
 * Process summarization job
 */
async function processSummarizeJob(ctx: any, job: any) {
  if (!job.conversationId) {
    throw new Error("Conversation ID required for summarize job");
  }

  const result = await ctx.runAction(internal.memory.summarizer.summarizeConversation, {
    conversationId: job.conversationId,
    orgId: job.orgId,
    summaryType: "periodic",
  });

  // Update job with result
  await ctx.runMutation(internal.memory.jobs.updateJobProgress, {
    jobId: job._id,
    progress: 100,
    tokensUsed: result.tokensUsed,
    costUSD: result.costUSD,
  });

  return { summaryId: result.summaryId };
}

/**
 * Process embeddings generation job
 */
async function processEmbeddingsJob(ctx: any, job: any) {
  // Get memories without embeddings
  const memories = await ctx.runQuery(internal.memory.jobs.getMemoriesWithoutEmbeddings, {
    orgId: job.orgId,
    limit: 50,
  });

  if (memories.length === 0) {
    return { message: "No memories need embeddings" };
  }

  // Generate embeddings in batches
  const memoryIds = memories.map((m: any) => m._id);
  
  await ctx.runMutation(internal.memory.jobs.updateJobProgress, {
    jobId: job._id,
    progress: 0,
    totalItems: memoryIds.length,
    processedItems: 0,
  });

  const result = await ctx.runAction(internal.memory.embeddings.batchGenerateEmbeddings, {
    memoryIds,
    model: "text-embedding-3-small",
  });

  // Update job with final result
  await ctx.runMutation(internal.memory.jobs.updateJobProgress, {
    jobId: job._id,
    progress: 100,
    processedItems: result.successCount,
    tokensUsed: result.totalTokens,
    costUSD: result.totalCost,
  });

  return {
    generatedCount: result.successCount,
    failedCount: result.failureCount,
    totalCost: result.totalCost,
  };
}

/**
 * Process memory expiration job
 */
async function processExpireJob(ctx: any, job: any) {
  const now = Date.now();
  
  const result = await ctx.runMutation(internal.memory.manager.expireMemories, {
    orgId: job.orgId,
    beforeTimestamp: now,
  });

  // Update analytics
  await ctx.runMutation(internal.memory.jobs.updateExpirationAnalytics, {
    orgId: job.orgId,
    expiredCount: result.deletedCount,
  });

  return { expiredCount: result.deletedCount };
}

/**
 * Process consolidation job
 */
async function processConsolidateJob(ctx: any, job: any) {
  if (!job.conversationId) {
    throw new Error("Conversation ID required for consolidate job");
  }

  // Get old short-term memories to consolidate
  const memories = await ctx.runQuery(internal.memory.jobs.getOldShortTermMemories, {
    conversationId: job.conversationId,
    olderThan: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  if (memories.length < 2) {
    return { message: "Not enough memories to consolidate" };
  }

  // Create summary from these memories
  const summary = await ctx.runAction(internal.memory.summarizer.summarizeConversation, {
    conversationId: job.conversationId,
    orgId: job.orgId,
    memoryIds: memories.map((m: any) => m._id),
    summaryType: "periodic",
  });

  // Convert to long-term memory
  await ctx.runMutation(internal.memory.jobs.createLongTermMemory, {
    conversationId: job.conversationId,
    orgId: job.orgId,
    summary: summary.summary,
    sourceMemoryIds: memories.map((m: any) => m._id),
  });

  // Delete old short-term memories
  for (const memory of memories) {
    await ctx.runMutation(internal.memory.manager.deleteMemory, {
      memoryId: memory._id,
      orgId: job.orgId,
    });
  }

  return {
    consolidatedCount: memories.length,
    summaryId: summary.summaryId,
  };
}

/**
 * Process sentiment analysis job
 */
async function processSentimentJob(ctx: any, job: any) {
  if (!job.conversationId) {
    throw new Error("Conversation ID required for sentiment job");
  }

  const result = await ctx.runAction(internal.memory.summarizer.analyzeSentiment, {
    conversationId: job.conversationId,
    orgId: job.orgId,
  });

  return {
    sentiment: result.sentiment,
    score: result.score,
  };
}

// ─── Internal Queries and Mutations ────────────────────────────────────────

export const getPendingJobs = internalAction({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get pending jobs, prioritize by priority and scheduled time
    // This is a placeholder - actual implementation would query jobs table
    return [];
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("memory_jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };

    if (args.startedAt) updates.startedAt = args.startedAt;
    if (args.completedAt) updates.completedAt = args.completedAt;
    if (args.result) updates.result = args.result;
    if (args.error) updates.error = args.error;

    await ctx.db.patch(args.jobId, updates);
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("memory_jobs"),
    progress: v.number(),
    totalItems: v.optional(v.number()),
    processedItems: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    costUSD: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      progress: args.progress,
    };

    if (args.totalItems !== undefined) updates.totalItems = args.totalItems;
    if (args.processedItems !== undefined) updates.processedItems = args.processedItems;
    if (args.tokensUsed !== undefined) updates.tokensUsed = args.tokensUsed;
    if (args.costUSD !== undefined) updates.costUSD = args.costUSD;

    await ctx.db.patch(args.jobId, updates);
  },
});

export const retryJob = internalMutation({
  args: {
    jobId: v.id("memory_jobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const retryDelay = Math.pow(2, job.retryCount) * 60 * 1000; // Exponential backoff

    await ctx.db.patch(args.jobId, {
      status: "pending",
      retryCount: job.retryCount + 1,
      error: args.error,
      scheduledAt: Date.now() + retryDelay,
    });
  },
});

export const getMemoriesWithoutEmbeddings = internalAction({
  args: {
    orgId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation would find memories without embeddings
    return [];
  },
});

export const getOldShortTermMemories = internalAction({
  args: {
    conversationId: v.id("conversations"),
    olderThan: v.number(),
  },
  handler: async (ctx, args) => {
    // Implementation would find old short-term memories
    return [];
  },
});

export const createLongTermMemory = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    summary: v.string(),
    sourceMemoryIds: v.array(v.id("conversation_memories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const memoryId = await ctx.db.insert("conversation_memories", {
      conversationId: args.conversationId,
      orgId: args.orgId,
      type: "long_term",
      content: args.summary,
      tokenCount: Math.ceil(args.summary.length / 4), // Approximate
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      relevanceScore: 1.0,
    });

    return memoryId;
  },
});

export const updateExpirationAnalytics = internalMutation({
  args: {
    orgId: v.string(),
    expiredCount: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("memory_analytics")
      .withIndex("by_org_date", q =>
        q.eq("orgId", args.orgId).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        memoriesExpired: existing.memoriesExpired + args.expiredCount,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Schedule a new memory job
 */
export const scheduleJob = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    jobType: v.union(
      v.literal("summarize"),
      v.literal("generate_embeddings"),
      v.literal("expire_memories"),
      v.literal("consolidate"),
      v.literal("analyze_sentiment")
    ),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    delay: v.optional(v.number()), // milliseconds
  },
  handler: async (ctx, args) => {
    const priority = args.priority || "medium";
    const delay = args.delay || 0;

    const jobId = await ctx.db.insert("memory_jobs", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      jobType: args.jobType,
      status: "pending",
      progress: 0,
      scheduledAt: Date.now() + delay,
      retryCount: 0,
      maxRetries: 3,
      priority,
    });

    return jobId;
  },
});

/**
 * Cancel a job
 */
export const cancelJob = internalMutation({
  args: {
    jobId: v.id("memory_jobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
  },
});
