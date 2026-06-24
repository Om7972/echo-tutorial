/**
 * Automation Execution Logs
 * Query execution history and logs
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get execution history for a workflow
 */
export const getExecutions = query({
  args: {
    workflowId: v.id("automation_workflows"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("automation_executions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .order("desc");

    if (args.status) {
      query = ctx.db
        .query("automation_executions")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.workflowId).eq("status", args.status as any))
        .order("desc");
    }

    const limit = args.limit || 50;
    const executions = await query.take(limit);

    return executions;
  },
});

/**
 * Get a single execution with full details
 */
export const getExecution = query({
  args: {
    executionId: v.id("automation_executions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    // Get logs
    const logs = await ctx.db
      .query("automation_logs")
      .withIndex("by_execution_id", (q) => q.eq("executionId", args.executionId))
      .order("asc")
      .collect();

    // Get workflow
    const workflow = await ctx.db.get(execution.workflowId);

    // Get conversation if available
    let conversation = null;
    if (execution.conversationId) {
      conversation = await ctx.db.get(execution.conversationId);
    }

    return {
      ...execution,
      logs,
      workflow,
      conversation,
    };
  },
});

/**
 * Get logs for an execution
 */
export const getExecutionLogs = query({
  args: {
    executionId: v.id("automation_executions"),
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("automation_logs")
      .withIndex("by_execution_id", (q) => q.eq("executionId", args.executionId))
      .order("asc");

    const logs = await query.collect();

    if (args.level) {
      return logs.filter((log) => log.level === args.level);
    }

    return logs;
  },
});

/**
 * Get execution statistics for an organization
 */
export const getExecutionStats = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const executions = await ctx.db
      .query("automation_executions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("startedAt"), cutoffDate))
      .collect();

    const total = executions.length;
    const completed = executions.filter((e) => e.status === "completed").length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const running = executions.filter((e) => e.status === "running").length;

    // Group by workflow
    const byWorkflow = executions.reduce((acc: any, exec) => {
      const workflowId = exec.workflowId;
      if (!acc[workflowId]) {
        acc[workflowId] = {
          workflowId,
          total: 0,
          completed: 0,
          failed: 0,
        };
      }
      acc[workflowId].total++;
      if (exec.status === "completed") acc[workflowId].completed++;
      if (exec.status === "failed") acc[workflowId].failed++;
      return acc;
    }, {});

    // Calculate avg execution time
    const completedExecutions = executions.filter(
      (e) => e.status === "completed" && e.completedAt
    );
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce(
            (sum, e) => sum + (e.completedAt! - e.startedAt),
            0
          ) / completedExecutions.length
        : 0;

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgExecutionTimeMs: avgExecutionTime,
      byWorkflow: Object.values(byWorkflow),
    };
  },
});

/**
 * Get recent errors across all workflows
 */
export const getRecentErrors = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const errorLogs = await ctx.db
      .query("automation_logs")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("level"), "error"))
      .order("desc")
      .take(limit);

    // Enrich with execution and workflow info
    const enrichedLogs = await Promise.all(
      errorLogs.map(async (log) => {
        const execution = await ctx.db.get(log.executionId);
        const workflow = await ctx.db.get(log.workflowId);

        return {
          ...log,
          execution,
          workflow,
        };
      })
    );

    return enrichedLogs;
  },
});

/**
 * Get execution timeline (for visualization)
 */
export const getExecutionTimeline = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const executions = await ctx.db
      .query("automation_executions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("startedAt"), cutoffDate))
      .collect();

    // Group by date
    const timeline: Record<string, { date: string; total: number; completed: number; failed: number }> = {};

    executions.forEach((exec) => {
      const date = new Date(exec.startedAt).toISOString().split("T")[0];
      if (!timeline[date]) {
        timeline[date] = {
          date,
          total: 0,
          completed: 0,
          failed: 0,
        };
      }
      timeline[date].total++;
      if (exec.status === "completed") timeline[date].completed++;
      if (exec.status === "failed") timeline[date].failed++;
    });

    return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
  },
});
