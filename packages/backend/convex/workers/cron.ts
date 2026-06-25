// @ts-nocheck
/**
 * Cron Job Scheduler
 * Scheduled recurring jobs
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getCronJobs = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("cron_jobs");

    if (args.isActive !== undefined) {
      q = q.withIndex("by_active", (q) => q.eq("isActive", args.isActive));
    }

    return await q.order("desc").collect();
  },
});

export const getCronJob = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cron_jobs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const getUpcomingJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cron_jobs")
      .withIndex("by_next_run", (q) => q.gte("nextRunAt", Date.now()))
      .order("asc")
      .take(args.limit || 10);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const createCronJob = mutation({
  args: {
    name: v.string(),
    schedule: v.string(), // Cron expression
    jobType: v.string(),
    payload: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate cron expression
    if (!isValidCronExpression(args.schedule)) {
      throw new Error("Invalid cron expression");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("cron_jobs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Cron job with name "${args.name}" already exists`);
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(args.schedule);

    const jobId = await ctx.db.insert("cron_jobs", {
      name: args.name,
      schedule: args.schedule,
      jobType: args.jobType,
      payload: args.payload,
      isActive: args.isActive !== false,
      nextRunAt,
      runCount: 0,
      createdAt: Date.now(),
    });

    return jobId;
  },
});

export const updateCronJob = mutation({
  args: {
    name: v.string(),
    schedule: v.optional(v.string()),
    payload: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("cron_jobs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!job) {
      throw new Error("Cron job not found");
    }

    const updates: any = {};

    if (args.schedule) {
      if (!isValidCronExpression(args.schedule)) {
        throw new Error("Invalid cron expression");
      }
      updates.schedule = args.schedule;
      updates.nextRunAt = calculateNextRunTime(args.schedule);
    }

    if (args.payload !== undefined) {
      updates.payload = args.payload;
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(job._id, updates);

    return { success: true };
  },
});

export const deleteCronJob = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("cron_jobs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!job) {
      throw new Error("Cron job not found");
    }

    await ctx.db.delete(job._id);

    return { success: true };
  },
});

export const recordCronRun = internalMutation({
  args: {
    name: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("cron_jobs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!job) {
      throw new Error("Cron job not found");
    }

    const runCount = job.runCount + 1;
    const avgDuration = job.avgDuration
      ? (job.avgDuration * job.runCount + args.duration) / runCount
      : args.duration;

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(job.schedule);

    await ctx.db.patch(job._id, {
      lastRunAt: Date.now(),
      nextRunAt,
      lastStatus: args.status,
      lastError: args.error,
      runCount,
      avgDuration,
    });

    return { success: true };
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const runCronJobs = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get jobs that need to run
    const jobsToRun = await ctx.runQuery(internal.workers.cron.getJobsDueToRun, {
      timestamp: now,
    });

    const results = [];

    for (const job of jobsToRun) {
      const startTime = Date.now();

      try {
        // Enqueue the job
        await ctx.runMutation(internal.workers.queue.enqueueJob, {
          orgId: "system", // System jobs
          jobType: job.jobType as any,
          priority: "high",
          payload: job.payload || {},
        });

        const duration = Date.now() - startTime;

        await ctx.runMutation(internal.workers.cron.recordCronRun, {
          name: job.name,
          status: "success",
          duration,
        });

        results.push({ name: job.name, status: "success" });
      } catch (error) {
        const duration = Date.now() - startTime;

        await ctx.runMutation(internal.workers.cron.recordCronRun, {
          name: job.name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          duration,
        });

        results.push({ name: job.name, status: "failed" });
      }
    }

    return { ran: results.length, results };
  },
});

export const getJobsDueToRun = query({
  args: {
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cron_jobs")
      .withIndex("by_next_run", (q) => q.lte("nextRunAt", args.timestamp))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// ─── Setup Default Jobs ─────────────────────────────────────────────────────

export const setupDefaultJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultJobs = [
      {
        name: "daily-analytics",
        schedule: "0 2 * * *", // 2 AM daily
        jobType: "analytics",
        payload: { type: "daily_aggregation" },
      },
      {
        name: "cleanup-old-logs",
        schedule: "0 3 * * *", // 3 AM daily
        jobType: "cleanup",
        payload: { type: "old_logs", olderThanDays: 30 },
      },
      {
        name: "backup-data",
        schedule: "0 4 * * *", // 4 AM daily
        jobType: "cleanup",
        payload: { type: "backup" },
      },
      {
        name: "process-queue",
        schedule: "*/5 * * * *", // Every 5 minutes
        jobType: "cleanup",
        payload: { type: "process_queue" },
      },
      {
        name: "health-check",
        schedule: "*/1 * * * *", // Every minute
        jobType: "cleanup",
        payload: { type: "health_check" },
      },
      {
        name: "cleanup-expired-sessions",
        schedule: "0 * * * *", // Every hour
        jobType: "cleanup",
        payload: { type: "expired_sessions" },
      },
      {
        name: "rotate-secrets",
        schedule: "0 0 * * 0", // Weekly on Sunday
        jobType: "cleanup",
        payload: { type: "rotate_secrets" },
      },
    ];

    const created = [];

    for (const job of defaultJobs) {
      const existing = await ctx.db
        .query("cron_jobs")
        .withIndex("by_name", (q) => q.eq("name", job.name))
        .first();

      if (!existing) {
        const nextRunAt = calculateNextRunTime(job.schedule);

        const jobId = await ctx.db.insert("cron_jobs", {
          name: job.name,
          schedule: job.schedule,
          jobType: job.jobType,
          payload: job.payload,
          isActive: true,
          nextRunAt,
          runCount: 0,
          createdAt: Date.now(),
        });

        created.push(job.name);
      }
    }

    return { created, count: created.length };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Validate cron expression
 * Format: minute hour day month dayOfWeek
 */
function isValidCronExpression(expression: string): boolean {
  const parts = expression.split(" ");
  if (parts.length !== 5) return false;

  const [minute, hour, day, month, dayOfWeek] = parts;

  // Simple validation - in production use a library like cron-parser
  const isValidPart = (part: string, min: number, max: number) => {
    if (part === "*") return true;
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      return range === "*" && !isNaN(parseInt(step));
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-");
      const s = parseInt(start);
      const e = parseInt(end);
      return !isNaN(s) && !isNaN(e) && s >= min && e <= max && s <= e;
    }
    const num = parseInt(part);
    return !isNaN(num) && num >= min && num <= max;
  };

  return (
    isValidPart(minute, 0, 59) &&
    isValidPart(hour, 0, 23) &&
    isValidPart(day, 1, 31) &&
    isValidPart(month, 1, 12) &&
    isValidPart(dayOfWeek, 0, 6)
  );
}

/**
 * Calculate next run time from cron expression
 * Simplified implementation - use cron-parser in production
 */
function calculateNextRunTime(expression: string): number {
  const parts = expression.split(" ");
  const [minuteExpr, hourExpr, dayExpr, monthExpr, dayOfWeekExpr] = parts;

  const now = new Date();
  const next = new Date(now);

  // Parse minute
  if (minuteExpr === "*" || minuteExpr.includes("/")) {
    const step = minuteExpr.includes("/") ? parseInt(minuteExpr.split("/")[1]) : 1;
    next.setMinutes(Math.ceil(now.getMinutes() / step) * step);
  } else {
    next.setMinutes(parseInt(minuteExpr));
  }

  // Parse hour
  if (hourExpr === "*") {
    // Keep current hour if minute is in future, otherwise next hour
    if (next <= now) {
      next.setHours(now.getHours() + 1);
      next.setMinutes(parseInt(minuteExpr === "*" ? "0" : minuteExpr));
    }
  } else {
    next.setHours(parseInt(hourExpr));
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  next.setSeconds(0);
  next.setMilliseconds(0);

  return next.getTime();
}

/**
 * Get human-readable cron description
 */
export function describeCronExpression(expression: string): string {
  const parts = expression.split(" ");
  const [minute, hour, day, month, dayOfWeek] = parts;

  if (expression === "* * * * *") return "Every minute";
  if (expression.match(/^\*\/\d+ \* \* \* \*$/)) {
    const interval = expression.split(" ")[0].split("/")[1];
    return `Every ${interval} minutes`;
  }
  if (expression.match(/^\d+ \d+ \* \* \*$/)) {
    return `Daily at ${hour}:${minute.padStart(2, "0")}`;
  }
  if (expression.match(/^\d+ \d+ \* \* \d+$/)) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `Every ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, "0")}`;
  }

  return expression;
}
