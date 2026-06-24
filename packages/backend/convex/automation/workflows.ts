/**
 * Automation Workflows Management
 * Handles CRUD operations for automation workflows
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all workflows for an organization
 */
export const getWorkflows = query({
  args: {
    orgId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("automation_workflows")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

    if (args.activeOnly) {
      query = ctx.db
        .query("automation_workflows")
        .withIndex("by_org_active", (q) => 
          q.eq("orgId", args.orgId).eq("isActive", true)
        );
    }

    const workflows = await query.collect();

    // Get triggers, conditions, and actions for each workflow
    const enrichedWorkflows = await Promise.all(
      workflows.map(async (workflow) => {
        const triggers = await ctx.db
          .query("automation_triggers")
          .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
          .collect();

        const conditions = await ctx.db
          .query("automation_conditions")
          .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
          .collect();

        const actions = await ctx.db
          .query("automation_actions")
          .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
          .order("asc")
          .collect();

        return {
          ...workflow,
          triggers,
          conditions,
          actions: actions.sort((a, b) => a.order - b.order),
        };
      })
    );

    return enrichedWorkflows.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get a single workflow by ID
 */
export const getWorkflow = query({
  args: {
    workflowId: v.id("automation_workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const triggers = await ctx.db
      .query("automation_triggers")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
      .collect();

    const conditions = await ctx.db
      .query("automation_conditions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
      .collect();

    const actions = await ctx.db
      .query("automation_actions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow._id))
      .order("asc")
      .collect();

    return {
      ...workflow,
      triggers,
      conditions,
      actions: actions.sort((a, b) => a.order - b.order),
    };
  },
});

/**
 * Get workflow statistics
 */
export const getWorkflowStats = query({
  args: {
    workflowId: v.id("automation_workflows"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const daysAgo = args.days || 30;
    const cutoffDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    // Get recent executions
    const executions = await ctx.db
      .query("automation_executions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .filter((q) => q.gte(q.field("startedAt"), cutoffDate))
      .collect();

    const completed = executions.filter((e) => e.status === "completed").length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const running = executions.filter((e) => e.status === "running").length;

    // Calculate success rate
    const successRate =
      completed + failed > 0 ? (completed / (completed + failed)) * 100 : 0;

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
      totalExecutions: executions.length,
      completed,
      failed,
      running,
      successRate,
      avgExecutionTimeMs: avgExecutionTime,
      lastExecutedAt: workflow.lastExecutedAt,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new workflow
 */
export const createWorkflow = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    retryOnFailure: v.boolean(),
    maxRetries: v.number(),
    createdBy: v.string(),
    flowData: v.optional(v.any()),
    triggers: v.array(
      v.object({
        triggerType: v.string(),
        config: v.any(),
      })
    ),
    conditions: v.array(
      v.object({
        conditionType: v.string(),
        operator: v.string(),
        value: v.any(),
        logicOperator: v.optional(v.string()),
      })
    ),
    actions: v.array(
      v.object({
        order: v.number(),
        actionType: v.string(),
        config: v.any(),
        retryOnFailure: v.boolean(),
        maxRetries: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create workflow
    const workflowId = await ctx.db.insert("automation_workflows", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      isActive: args.isActive,
      flowData: args.flowData,
      priority: args.priority,
      retryOnFailure: args.retryOnFailure,
      maxRetries: args.maxRetries,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Create triggers
    for (const trigger of args.triggers) {
      await ctx.db.insert("automation_triggers", {
        orgId: args.orgId,
        workflowId,
        triggerType: trigger.triggerType as any,
        config: trigger.config,
        createdAt: now,
      });
    }

    // Create conditions
    for (const condition of args.conditions) {
      await ctx.db.insert("automation_conditions", {
        orgId: args.orgId,
        workflowId,
        conditionType: condition.conditionType as any,
        operator: condition.operator as any,
        value: condition.value,
        logicOperator: condition.logicOperator as any,
        createdAt: now,
      });
    }

    // Create actions
    for (const action of args.actions) {
      await ctx.db.insert("automation_actions", {
        orgId: args.orgId,
        workflowId,
        order: action.order,
        actionType: action.actionType as any,
        config: action.config,
        retryOnFailure: action.retryOnFailure,
        maxRetries: action.maxRetries,
        createdAt: now,
      });
    }

    return workflowId;
  },
});

/**
 * Update a workflow
 */
export const updateWorkflow = mutation({
  args: {
    workflowId: v.id("automation_workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    retryOnFailure: v.optional(v.boolean()),
    maxRetries: v.optional(v.number()),
    flowData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { workflowId, ...updates } = args;

    await ctx.db.patch(workflowId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return workflowId;
  },
});

/**
 * Delete a workflow
 */
export const deleteWorkflow = mutation({
  args: {
    workflowId: v.id("automation_workflows"),
  },
  handler: async (ctx, args) => {
    // Delete triggers
    const triggers = await ctx.db
      .query("automation_triggers")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const trigger of triggers) {
      await ctx.db.delete(trigger._id);
    }

    // Delete conditions
    const conditions = await ctx.db
      .query("automation_conditions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const condition of conditions) {
      await ctx.db.delete(condition._id);
    }

    // Delete actions
    const actions = await ctx.db
      .query("automation_actions")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const action of actions) {
      await ctx.db.delete(action._id);
    }

    // Delete workflow
    await ctx.db.delete(args.workflowId);

    return { success: true };
  },
});

/**
 * Toggle workflow active status
 */
export const toggleWorkflowStatus = mutation({
  args: {
    workflowId: v.id("automation_workflows"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workflowId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
