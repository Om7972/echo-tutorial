/**
 * Worker Queue System
 * Background job processing with retry logic
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ─── Configuration ──────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000]; // Exponential backoff: 5s, 15s, 1m
const BATCH_SIZE = 10;
const DEAD_LETTER_THRESHOLD = MAX_RETRIES;

// ─── Queries ────────────────────────────────────────────────────────────────

export const getQueueStats = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("job_queue");

    if (args.orgId) {
      q = q.withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
    }

    const jobs = await q.collect();

    const stats = {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      cancelled: jobs.filter((j) => j.status === "cancelled").length,
      byType: {} as Record<string, number>,
      byPriority: {
        urgent: jobs.filter((j) => j.priority === "urgent").length,
        high: jobs.filter((j) => j.priority === "high").length,
        medium: jobs.filter((j) => j.priority === "medium").length,
        low: jobs.filter((j) => j.priority === "low").length,
      },
    };

    // Count by type
    for (const job of jobs) {
      stats.byType[job.jobType] = (stats.byType[job.jobType] || 0) + 1;
    }

    return stats;
  },
});

export const getJobs = query({
  args: {
    orgId: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
        v.literal("dead")
      )
    ),
    jobType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("job_queue");

    if (args.status) {
      q = q.withIndex("by_status", (q) => q.eq("status", args.status));
    } else if (args.orgId) {
      q = q.withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
    }

    let jobs = await q.order("desc").take(args.limit || 50);

    if (args.jobType) {
      jobs = jobs.filter((j) => j.jobType === args.jobType);
    }

    return jobs;
  },
});

export const getJob = query({
  args: {
    jobId: v.id("job_queue"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getDeadLetterQueue = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("dead_letter_queue");

    if (args.orgId) {
      q = q.withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
    }

    return await q.order("desc").take(args.limit || 50);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const enqueueJob = mutation({
  args: {
    orgId: v.string(),
    jobType: v.union(
      v.literal("email"),
      v.literal("embeddings"),
      v.literal("summaries"),
      v.literal("webhooks"),
      v.literal("notifications"),
      v.literal("analytics"),
      v.literal("cleanup")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
    ),
    payload: v.any(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("job_queue", {
      orgId: args.orgId,
      jobType: args.jobType,
      priority: args.priority || "medium",
      status: "pending",
      payload: args.payload,
      attempts: 0,
      maxAttempts: MAX_RETRIES,
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
    });

    return jobId;
  },
});

export const processNextJob = internalMutation({
  args: {
    jobType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find next pending job
    let query = ctx.db
      .query("job_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.or(
          q.eq(q.field("scheduledFor"), undefined),
          q.lte(q.field("scheduledFor"), now)
        )
      );

    if (args.jobType) {
      query = query.filter((q) => q.eq(q.field("jobType"), args.jobType as any));
    }

    const job = await query
      .order("desc") // Process urgent/high priority first
      .first();

    if (!job) {
      return null;
    }

    // Mark as processing
    await ctx.db.patch(job._id, {
      status: "processing",
      startedAt: now,
      processedBy: "worker-1", // TODO: Add worker ID
    });

    return job;
  },
});

export const completeJob = mutation({
  args: {
    jobId: v.id("job_queue"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await ctx.db.patch(args.jobId, {
      status: "completed",
      result: args.result,
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id("job_queue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const attempts = job.attempts + 1;

    // Check if should retry
    if (attempts < job.maxAttempts) {
      const retryDelay = RETRY_DELAYS[attempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      const nextRetryAt = Date.now() + retryDelay;

      await ctx.db.patch(args.jobId, {
        status: "pending",
        error: args.error,
        attempts,
        nextRetryAt,
      });

      return { willRetry: true, nextRetryAt };
    }

    // Move to dead letter queue
    await ctx.db.insert("dead_letter_queue", {
      orgId: job.orgId,
      originalJobId: args.jobId,
      jobType: job.jobType,
      payload: job.payload,
      error: args.error,
      attempts,
      failedAt: Date.now(),
      canRetry: true,
      retried: false,
    });

    await ctx.db.patch(args.jobId, {
      status: "dead",
      error: args.error,
      attempts,
      completedAt: Date.now(),
    });

    return { willRetry: false, movedToDeadLetter: true };
  },
});

export const cancelJob = mutation({
  args: {
    jobId: v.id("job_queue"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.status === "processing") {
      throw new Error("Cannot cancel job that is currently processing");
    }

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

export const retryDeadLetterJob = mutation({
  args: {
    deadLetterId: v.id("dead_letter_queue"),
  },
  handler: async (ctx, args) => {
    const deadJob = await ctx.db.get(args.deadLetterId);
    if (!deadJob) {
      throw new Error("Dead letter job not found");
    }

    if (deadJob.retried) {
      throw new Error("Job already retried");
    }

    // Create new job
    const newJobId = await ctx.db.insert("job_queue", {
      orgId: deadJob.orgId,
      jobType: deadJob.jobType as any,
      priority: "high", // Give retried jobs high priority
      status: "pending",
      payload: deadJob.payload,
      attempts: 0,
      maxAttempts: MAX_RETRIES,
      createdAt: Date.now(),
    });

    // Mark dead letter as retried
    await ctx.db.patch(args.deadLetterId, {
      retried: true,
      retriedAt: Date.now(),
    });

    return { newJobId };
  },
});

export const cleanupOldJobs = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const oldJobs = await ctx.db
      .query("job_queue")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("status"), "cancelled"),
            q.eq(q.field("status"), "dead")
          ),
          q.lt(q.field("createdAt"), cutoff)
        )
      )
      .collect();

    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
    }

    return { deleted: oldJobs.length };
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const processQueue = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const size = args.batchSize || BATCH_SIZE;
    const processed = [];

    for (let i = 0; i < size; i++) {
      const job = await ctx.runMutation(internal.workers.queue.processNextJob, {});

      if (!job) break; // No more jobs

      try {
        // Process based on job type
        let result;
        switch (job.jobType) {
          case "email":
            result = await processEmailJob(job.payload);
            break;
          case "embeddings":
            result = await processEmbeddingsJob(job.payload);
            break;
          case "summaries":
            result = await processSummariesJob(job.payload);
            break;
          case "webhooks":
            result = await processWebhooksJob(job.payload);
            break;
          case "notifications":
            result = await processNotificationsJob(job.payload);
            break;
          case "analytics":
            result = await processAnalyticsJob(job.payload);
            break;
          case "cleanup":
            result = await processCleanupJob(job.payload);
            break;
          default:
            throw new Error(`Unknown job type: ${job.jobType}`);
        }

        await ctx.runMutation(internal.workers.queue.completeJob, {
          jobId: job._id,
          result,
        });

        processed.push({ jobId: job._id, status: "completed" });
      } catch (error) {
        await ctx.runMutation(internal.workers.queue.failJob, {
          jobId: job._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        processed.push({ jobId: job._id, status: "failed" });
      }
    }

    return { processed: processed.length, jobs: processed };
  },
});

// ─── Job Processors ─────────────────────────────────────────────────────────

async function processEmailJob(payload: any): Promise<any> {
  // TODO: Implement email sending
  console.log("Processing email job:", payload);
  return { sent: true };
}

async function processEmbeddingsJob(payload: any): Promise<any> {
  // TODO: Implement embeddings generation
  console.log("Processing embeddings job:", payload);
  return { embedded: true };
}

async function processSummariesJob(payload: any): Promise<any> {
  // TODO: Implement summary generation
  console.log("Processing summaries job:", payload);
  return { summarized: true };
}

async function processWebhooksJob(payload: any): Promise<any> {
  // TODO: Implement webhook delivery
  console.log("Processing webhooks job:", payload);
  return { delivered: true };
}

async function processNotificationsJob(payload: any): Promise<any> {
  // TODO: Implement notification sending
  console.log("Processing notifications job:", payload);
  return { notified: true };
}

async function processAnalyticsJob(payload: any): Promise<any> {
  // TODO: Implement analytics aggregation
  console.log("Processing analytics job:", payload);
  return { aggregated: true };
}

async function processCleanupJob(payload: any): Promise<any> {
  // TODO: Implement cleanup tasks
  console.log("Processing cleanup job:", payload);
  return { cleaned: true };
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Enqueue multiple jobs at once
 */
export const enqueueBatch = mutation({
  args: {
    jobs: v.array(
      v.object({
        orgId: v.string(),
        jobType: v.string(),
        priority: v.optional(v.string()),
        payload: v.any(),
        scheduledFor: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const jobIds = [];

    for (const job of args.jobs) {
      const jobId = await ctx.db.insert("job_queue", {
        orgId: job.orgId,
        jobType: job.jobType as any,
        priority: (job.priority as any) || "medium",
        status: "pending",
        payload: job.payload,
        attempts: 0,
        maxAttempts: MAX_RETRIES,
        scheduledFor: job.scheduledFor,
        createdAt: Date.now(),
      });

      jobIds.push(jobId);
    }

    return { jobIds, count: jobIds.length };
  },
});

/**
 * Get queue health
 */
export const getQueueHealth = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentJobs = await ctx.db
      .query("job_queue")
      .filter((q) => q.gt(q.field("createdAt"), oneHourAgo))
      .collect();

    const processing = recentJobs.filter((j) => j.status === "processing");
    const stuck = processing.filter((j) => j.startedAt && now - j.startedAt > 300000); // 5 minutes

    const completed = recentJobs.filter((j) => j.status === "completed").length;
    const failed = recentJobs.filter((j) => j.status === "failed").length;
    const successRate = completed + failed > 0 ? completed / (completed + failed) : 1;

    return {
      healthy: stuck.length === 0 && successRate > 0.95,
      processing: processing.length,
      stuck: stuck.length,
      successRate,
      recentCompleted: completed,
      recentFailed: failed,
    };
  },
});
