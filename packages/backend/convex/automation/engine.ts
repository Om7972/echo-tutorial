// @ts-nocheck
/**
 * Automation Execution Engine
 * Handles workflow execution, condition evaluation, and action processing
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Execute a workflow manually
 */
export const executeWorkflow: any = action({
  args: {
    workflowId: v.id("automation_workflows"),
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.optional(v.id("unified_messages")),
    customerId: v.optional(v.id("unified_customers")),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // @ts-ignore - Type instantiation is excessively deep
    // Get workflow
    const workflow = await ctx.runQuery(internal.automation.engine.getWorkflowForExecution as any, {
      workflowId: args.workflowId,
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (!workflow.isActive) {
      throw new Error("Workflow is not active");
    }

    // Create execution record
    // @ts-ignore
    const executionId = await ctx.runMutation(internal.automation.engine.createExecution as any, {
      workflowId: args.workflowId,
      orgId: workflow.orgId,
      triggeredBy: "manual",
      triggerData: args.triggerData,
      conversationId: args.conversationId,
      messageId: args.messageId,
      customerId: args.customerId,
      totalSteps: workflow.actions.length,
    });

    // Execute workflow
    try {
      await ctx.runMutation(internal.automation.engine.updateExecutionStatus as any, {
        executionId,
        status: "running",
      });

      // Evaluate conditions
      const conditionsPassed = await evaluateConditions(
        ctx,
        workflow.conditions,
        {
          conversationId: args.conversationId,
          messageId: args.messageId,
          customerId: args.customerId,
        }
      );

      if (!conditionsPassed) {
        await ctx.runMutation(internal.automation.engine.updateExecutionStatus as any, {
          executionId,
          status: "completed",
        });

        await ctx.runMutation(internal.automation.engine.createLog as any, {
          workflowId: args.workflowId,
          executionId,
          orgId: workflow.orgId,
          level: "info",
          step: "Conditions",
          message: "Workflow conditions not met",
        });

        return { executionId, status: "conditions_not_met" };
      }

      // Execute actions in order
      let currentStep = 0;
      for (const action of workflow.actions) {
        currentStep++;

        await ctx.runMutation(internal.automation.engine.createLog as any, {
          workflowId: args.workflowId,
          executionId,
          orgId: workflow.orgId,
          level: "info",
          step: action.actionType,
          message: `Executing action: ${action.actionType}`,
        });

        try {
          const result = await executeAction(ctx, action, {
            orgId: workflow.orgId,
            conversationId: args.conversationId,
            messageId: args.messageId,
            customerId: args.customerId,
          });

          await ctx.runMutation(internal.automation.engine.incrementActionsExecuted as any, {
            executionId,
          });

          await ctx.runMutation(internal.automation.engine.createLog as any, {
            workflowId: args.workflowId,
            executionId,
            orgId: workflow.orgId,
            level: "info",
            step: action.actionType,
            message: `Action completed successfully`,
            actionResult: result,
          });
        } catch (error: any) {
          await ctx.runMutation(internal.automation.engine.incrementActionsFailed as any, {
            executionId,
          });

          await ctx.runMutation(internal.automation.engine.createLog as any, {
            workflowId: args.workflowId,
            executionId,
            orgId: workflow.orgId,
            level: "error",
            step: action.actionType,
            message: `Action failed: ${error.message}`,
            errorMessage: error.message,
          });

          if (!action.retryOnFailure) {
            throw error;
          }
        }

        await ctx.runMutation(internal.automation.engine.updateExecutionStep as any, {
          executionId,
          currentStep,
        });
      }

      // Mark as completed
      await ctx.runMutation(internal.automation.engine.updateExecutionStatus as any, {
        executionId,
        status: "completed",
      });

      await ctx.runMutation(internal.automation.engine.incrementWorkflowSuccess as any, {
        workflowId: args.workflowId,
      });

      return { executionId, status: "completed" };
    } catch (error: any) {
      await ctx.runMutation(internal.automation.engine.updateExecutionStatus as any, {
        executionId,
        status: "failed",
        errorMessage: error.message,
      });

      await ctx.runMutation(internal.automation.engine.incrementWorkflowFailure as any, {
        workflowId: args.workflowId,
      });

      throw error;
    }
  },
});

// ─── Internal Queries ───────────────────────────────────────────────────────

export const getWorkflowForExecution = internalQuery({
  args: {
    workflowId: v.id("automation_workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) return null;

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
      conditions,
      actions: actions.sort((a, b) => a.order - b.order),
    };
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────

export const createExecution = internalMutation({
  args: {
    workflowId: v.id("automation_workflows"),
    orgId: v.string(),
    triggeredBy: v.string(),
    triggerData: v.optional(v.any()),
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.optional(v.id("unified_messages")),
    customerId: v.optional(v.id("unified_customers")),
    totalSteps: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("automation_executions", {
      orgId: args.orgId,
      workflowId: args.workflowId,
      triggeredBy: args.triggeredBy as any,
      triggerData: args.triggerData,
      conversationId: args.conversationId,
      messageId: args.messageId,
      customerId: args.customerId,
      status: "pending",
      currentStep: 0,
      totalSteps: args.totalSteps,
      actionsExecuted: 0,
      actionsFailed: 0,
      retryCount: 0,
      startedAt: now,
      createdAt: now,
    });
  },
});

export const updateExecutionStatus = internalMutation({
  args: {
    executionId: v.id("automation_executions"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.executionId, updates);
  },
});

export const updateExecutionStep = internalMutation({
  args: {
    executionId: v.id("automation_executions"),
    currentStep: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      currentStep: args.currentStep,
    });
  },
});

export const incrementActionsExecuted = internalMutation({
  args: {
    executionId: v.id("automation_executions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return;

    await ctx.db.patch(args.executionId, {
      actionsExecuted: execution.actionsExecuted + 1,
    });
  },
});

export const incrementActionsFailed = internalMutation({
  args: {
    executionId: v.id("automation_executions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return;

    await ctx.db.patch(args.executionId, {
      actionsFailed: execution.actionsFailed + 1,
    });
  },
});

export const incrementWorkflowSuccess = internalMutation({
  args: {
    workflowId: v.id("automation_workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) return;

    await ctx.db.patch(args.workflowId, {
      totalExecutions: workflow.totalExecutions + 1,
      successfulExecutions: workflow.successfulExecutions + 1,
      lastExecutedAt: Date.now(),
    });
  },
});

export const incrementWorkflowFailure = internalMutation({
  args: {
    workflowId: v.id("automation_workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) return;

    await ctx.db.patch(args.workflowId, {
      totalExecutions: workflow.totalExecutions + 1,
      failedExecutions: workflow.failedExecutions + 1,
      lastExecutedAt: Date.now(),
    });
  },
});

export const createLog = internalMutation({
  args: {
    workflowId: v.id("automation_workflows"),
    executionId: v.id("automation_executions"),
    orgId: v.string(),
    level: v.string(),
    step: v.string(),
    message: v.string(),
    actionResult: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("automation_logs", {
      orgId: args.orgId,
      workflowId: args.workflowId,
      executionId: args.executionId,
      level: args.level as any,
      step: args.step,
      message: args.message,
      details: args.actionResult ? { result: args.actionResult } : undefined,
      actionResult: args.actionResult,
      errorMessage: args.errorMessage,
      timestamp: Date.now(),
    });
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Evaluate workflow conditions
 */
async function evaluateConditions(
  ctx: any,
  conditions: any[],
  context: any
): Promise<boolean> {
  if (conditions.length === 0) {
    return true; // No conditions = always pass
  }

  // Get conversation and message data if needed
  let conversation = null;
  let message = null;
  let customer = null;

  if (context.conversationId) {
    conversation = await ctx.runQuery(internal.automation.engine.getConversation, {
      conversationId: context.conversationId,
    });
  }

  if (context.messageId) {
    message = await ctx.runQuery(internal.automation.engine.getMessage, {
      messageId: context.messageId,
    });
  }

  if (context.customerId) {
    customer = await ctx.runQuery(internal.automation.engine.getCustomer, {
      customerId: context.customerId,
    });
  }

  // Evaluate each condition
  const results = conditions.map((condition) => {
    return evaluateCondition(condition, { conversation, message, customer });
  });

  // Apply logic operators (AND by default)
  return results.every((result) => result === true);
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: any, data: any): boolean {
  const { conditionType, operator, value } = condition;
  const { conversation, message, customer } = data;

  // Get the actual value to compare
  let actualValue: any;

  switch (conditionType) {
    case "priority":
      actualValue = conversation?.priority;
      break;
    case "tags":
      actualValue = conversation?.tags || [];
      break;
    case "customer_tier":
      actualValue = customer?.tier;
      break;
    case "assigned_to":
      actualValue = conversation?.assignedTo;
      break;
    case "channel_type":
      actualValue = conversation?.channelType;
      break;
    case "message_count":
      actualValue = conversation?.totalMessages;
      break;
    default:
      return true;
  }

  // Apply operator
  switch (operator) {
    case "equals":
      return actualValue === value;
    case "not_equals":
      return actualValue !== value;
    case "contains":
      if (Array.isArray(actualValue)) {
        return actualValue.includes(value);
      }
      return String(actualValue).includes(String(value));
    case "not_contains":
      if (Array.isArray(actualValue)) {
        return !actualValue.includes(value);
      }
      return !String(actualValue).includes(String(value));
    case "greater_than":
      return Number(actualValue) > Number(value);
    case "less_than":
      return Number(actualValue) < Number(value);
    case "in":
      return Array.isArray(value) && value.includes(actualValue);
    case "not_in":
      return Array.isArray(value) && !value.includes(actualValue);
    default:
      return true;
  }
}

/**
 * Execute a single action
 */
async function executeAction(ctx: any, action: any, context: any): Promise<any> {
  const { actionType, config } = action;

  switch (actionType) {
    case "assign_agent":
      return await executeAssignAgent(ctx, config, context);
    case "send_message":
      return await executeSendMessage(ctx, config, context);
    case "add_tag":
      return await executeAddTag(ctx, config, context);
    case "remove_tag":
      return await executeRemoveTag(ctx, config, context);
    case "set_priority":
      return await executeSetPriority(ctx, config, context);
    case "close_conversation":
      return await executeCloseConversation(ctx, config, context);
    case "create_note":
      return await executeCreateNote(ctx, config, context);
    case "wait":
      return await executeWait(ctx, config, context);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

// Action executors (simplified implementations)
async function executeAssignAgent(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for assign agent action");
  }

  await ctx.runMutation(internal.automation.engine.assignConversation, {
    conversationId: context.conversationId,
    agentId: config.agentId,
  });

  return { agentId: config.agentId };
}

async function executeSendMessage(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for send message action");
  }

  return { message: config.messageContent };
}

async function executeAddTag(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for add tag action");
  }

  return { tags: config.tags };
}

async function executeRemoveTag(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for remove tag action");
  }

  return { tags: config.tags };
}

async function executeSetPriority(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for set priority action");
  }

  await ctx.runMutation(internal.automation.engine.updateConversationPriority, {
    conversationId: context.conversationId,
    priority: config.priority,
  });

  return { priority: config.priority };
}

async function executeCloseConversation(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for close conversation action");
  }

  await ctx.runMutation(internal.automation.engine.closeConversation, {
    conversationId: context.conversationId,
  });

  return { status: "closed" };
}

async function executeCreateNote(ctx: any, config: any, context: any) {
  if (!context.conversationId) {
    throw new Error("Conversation ID required for create note action");
  }

  return { note: config.noteContent };
}

async function executeWait(ctx: any, config: any, context: any) {
  const ms = (config.waitSeconds || 0) * 1000;
  await new Promise((resolve) => setTimeout(resolve, ms));
  return { waited: config.waitSeconds };
}

// Helper queries and mutations
export const getConversation = internalQuery({
  args: { conversationId: v.id("unified_conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const getMessage = internalQuery({
  args: { messageId: v.id("unified_messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const getCustomer = internalQuery({
  args: { customerId: v.id("unified_customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.customerId);
  },
});

export const assignConversation = internalMutation({
  args: {
    conversationId: v.id("unified_conversations"),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      assignedTo: args.agentId,
      assignedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateConversationPriority = internalMutation({
  args: {
    conversationId: v.id("unified_conversations"),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      priority: args.priority as any,
      updatedAt: Date.now(),
    });
  },
});

export const closeConversation = internalMutation({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      status: "closed",
      updatedAt: Date.now(),
    });
  },
});
