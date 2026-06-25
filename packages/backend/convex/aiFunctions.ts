// @ts-nocheck
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── Tool Definitions & Types ─────────────────────────────────────────────────
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
  validate: (args: any) => Promise<{ valid: boolean; error?: string }>;
  execute: (
    args: any,
    ctx: any,
    orgId: string,
    conversationId?: Id<"conversations">
  ) => Promise<any>;
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS: ToolDefinition[] = [
  {
    name: "searchKnowledgeBase",
    description: "Search the knowledge base for answers to customer questions",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The question to search for" },
        category: { type: "string", description: "Optional category to filter by" },
        limit: { type: "number", description: "Number of results to return, default 5" },
      },
      required: ["query"],
    },
    async validate(args: any) {
      if (!args.query || args.query.trim().length === 0) {
        return { valid: false, error: "Query parameter is required and cannot be empty" };
      }
      if (args.limit && (args.limit < 1 || args.limit > 20)) {
        return { valid: false, error: "Limit must be between 1 and 20" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string) {
      const results = await ctx.db
        .query("knowledge_base")
        .withIndex("by_org_id", (q: any) => q.eq("orgId", orgId))
        .collect();

      const searchLower = args.query.toLowerCase();
      const filtered = results.filter(
        (item: any) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower)
      );

      const sorted = filtered.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
      return sorted.slice(0, args.limit || 5).map((item: any) => ({
        id: item._id,
        title: item.title,
        content: item.content,
        category: item.category,
      }));
    },
  },
  {
    name: "handoffToHuman",
    description: "Escalate the conversation to a human support agent",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Reason for handoff" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Priority level for the handoff",
        },
      },
      required: ["reason"],
    },
    async validate(args: any) {
      if (!args.reason || args.reason.trim().length === 0) {
        return { valid: false, error: "Reason parameter is required" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string, conversationId?: Id<"conversations">) {
      if (conversationId) {
        await ctx.db.patch(conversationId, {
          status: "waiting",
          priority: args.priority || "medium",
        });

        await ctx.db.insert("messages", {
          conversationId,
          senderId: "system",
          senderName: "System",
          senderType: "system",
          type: "system",
          content: `Handoff requested: ${args.reason}. A support agent will be with you shortly.`,
          status: "sent",
          timestamp: Date.now(),
        });
      }
      return { success: true, message: "Handoff initiated" };
    },
  },
  {
    name: "closeConversation",
    description: "Close or resolve the current conversation",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Brief summary of the conversation" },
      },
      required: ["summary"],
    },
    async validate(args: any) {
      if (!args.summary || args.summary.trim().length === 0) {
        return { valid: false, error: "Summary parameter is required" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string, conversationId?: Id<"conversations">) {
      if (conversationId) {
        await ctx.db.patch(conversationId, {
          status: "resolved",
          lastMessageText: `Conversation closed: ${args.summary}`,
        });

        await ctx.db.insert("messages", {
          conversationId,
          senderId: "system",
          senderName: "System",
          senderType: "system",
          type: "system",
          content: `Conversation closed: ${args.summary}`,
          status: "sent",
          timestamp: Date.now(),
        });
      }
      return { success: true, message: "Conversation closed successfully" };
    },
  },
  {
    name: "createTicket",
    description: "Create a support ticket for the issue",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Ticket title" },
        description: { type: "string", description: "Ticket description" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Ticket priority",
        },
        tags: { type: "array", items: { type: "string" }, description: "Tags for the ticket" },
      },
      required: ["title", "description"],
    },
    async validate(args: any) {
      if (!args.title || args.title.trim().length === 0) {
        return { valid: false, error: "Title is required" };
      }
      if (!args.description || args.description.trim().length === 0) {
        return { valid: false, error: "Description is required" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string) {
      const conversationId = await ctx.db.insert("conversations", {
        orgId,
        status: "waiting",
        isArchived: false,
        isPinned: false,
        priority: args.priority || "medium",
        tags: args.tags || [],
        lastMessageText: `Ticket: ${args.title}`,
        lastMessageTimestamp: Date.now(),
        createdAt: Date.now(),
      });
      return { success: true, conversationId, message: "Ticket created" };
    },
  },
  {
    name: "summarizeConversation",
    description: "Summarize the current conversation",
    parameters: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["short", "medium", "detailed"],
          description: "Summary format",
        },
      },
      required: [],
    },
    async validate(args: any) {
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string, conversationId?: Id<"conversations">) {
      if (!conversationId) {
        throw new Error("No conversation ID provided");
      }
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_id", (q: any) => q.eq("conversationId", conversationId))
        .collect();

      const summary =
        args.format === "short"
          ? `${messages.length} messages exchanged. Latest: ${messages[messages.length - 1]?.content}`
          : args.format === "detailed"
          ? messages.map((m: any) => `${m.senderName}: ${m.content}`).join("\n")
          : `Conversation has ${messages.length} messages, latest from ${messages[messages.length - 1]?.senderName}`;

      return { summary };
    },
  },
  {
    name: "generateReply",
    description: "Generate a suggested reply for the agent to use",
    parameters: {
      type: "object",
      properties: {
        tone: { type: "string", enum: ["friendly", "professional", "formal"] },
        topic: { type: "string", description: "Topic for the reply" },
      },
      required: ["topic"],
    },
    async validate(args: any) {
      if (!args.topic || args.topic.trim().length === 0) {
        return { valid: false, error: "Topic is required" };
      }
      return { valid: true };
    },
    async execute(args: any) {
      const tone = args.tone || "professional";
      const prefixes: any = {
        friendly: "Hey there!",
        professional: "Hello!",
        formal: "Dear Customer,",
      };
      return {
        reply: `${prefixes[tone]} Thank you for reaching out about ${args.topic}. I'd be happy to help you with that.`,
      };
    },
  },
  {
    name: "tagConversation",
    description: "Add tags to the conversation for better organization",
    parameters: {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" }, description: "Tags to add" },
      },
      required: ["tags"],
    },
    async validate(args: any) {
      if (!Array.isArray(args.tags) || args.tags.length === 0) {
        return { valid: false, error: "Tags array is required and cannot be empty" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string, conversationId?: Id<"conversations">) {
      if (!conversationId) {
        throw new Error("No conversation ID provided");
      }
      const conv = await ctx.db.get(conversationId);
      if (!conv) {
        throw new Error("Conversation not found");
      }
      const existingTags = conv.tags || [];
      const newTags = [...new Set([...existingTags, ...args.tags])];
      await ctx.db.patch(conversationId, { tags: newTags });
      return { success: true, tags: newTags };
    },
  },
  {
    name: "detectSentiment",
    description: "Detect the sentiment of the latest messages in the conversation",
    parameters: {
      type: "object",
      properties: {
        lookBack: { type: "number", description: "Number of messages to analyze, default 3" },
      },
      required: [],
    },
    async validate(args: any) {
      if (args.lookBack && (args.lookBack < 1 || args.lookBack > 20)) {
        return { valid: false, error: "LookBack must be between 1 and 20" };
      }
      return { valid: true };
    },
    async execute(args: any, ctx: any, orgId: string, conversationId?: Id<"conversations">) {
      if (!conversationId) {
        throw new Error("No conversation ID provided");
      }
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_id", (q: any) => q.eq("conversationId", conversationId))
        .collect();

      const lastN = messages.slice(-(args.lookBack || 3));
      const sentiment = lastN.length > 0 ? "neutral" : "unknown";
      return {
        sentiment,
        confidence: 0.8,
        messagesAnalyzed: lastN.length,
      };
    },
  },
];

// ─── Helper: Get Tool by Name ─────────────────────────────────────────────────
const getTool = (name: string): ToolDefinition | undefined => {
  return TOOLS.find((tool) => tool.name === name);
};

// ─── Helper: Log Audit Event ─────────────────────────────────────────────────
const logAudit = async (
  ctx: any,
  orgId: string,
  event: any,
  conversationId?: Id<"conversations">,
  toolCallId?: Id<"tool_calls">,
  details?: any
) => {
  await ctx.db.insert("tool_audit_logs", {
    orgId,
    conversationId,
    toolCallId,
    event,
    details,
    timestamp: Date.now(),
  });
};

// ─── Helper: Update Cost Metrics ──────────────────────────────────────────────
const updateCostMetrics = async (
  ctx: any,
  orgId: string,
  provider: "openai" | "anthropic",
  model: string,
  costCents: number
) => {
  const today = new Date().toISOString().split("T")[0];
  const existing = await ctx.db
    .query("cost_metrics")
    .withIndex("by_org_date", (q: any) => q.eq("orgId", orgId).eq("date", today))
    .filter((q: any) => q.eq(q.field("provider"), provider).eq(q.field("model"), model))
    .collect();

  if (existing.length > 0) {
    const metric = existing[0];
    await ctx.db.patch(metric._id, {
      totalCost: metric.totalCost + costCents,
      totalCalls: metric.totalCalls + 1,
      lastUpdated: Date.now(),
    });
  } else {
    await ctx.db.insert("cost_metrics", {
      orgId,
      date: today,
      provider,
      model,
      totalCost: costCents,
      totalCalls: 1,
      lastUpdated: Date.now(),
    });
  }
};

// ─── Tool Execution Function ─────────────────────────────────────────────────
export const executeTool = internalMutation({
  args: {
    toolName: v.string(),
    arguments: v.optional(v.any()),
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
  },
  async handler(ctx: any, args: any) {
    const tool = getTool(args.toolName);
    if (!tool) {
      throw new Error(`Tool ${args.toolName} not found`);
    }

    // Create tool call record
    const toolCallId = await ctx.db.insert("tool_calls", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      toolName: args.toolName,
      arguments: args.arguments,
      status: "pending",
      provider: args.provider,
      model: args.model,
      startedAt: Date.now(),
    });

    await logAudit(
      ctx,
      args.orgId,
      "tool_call_initiated",
      args.conversationId,
      toolCallId,
      { toolName: args.toolName, arguments: args.arguments }
    );

    // Validate
    const validation = await tool.validate(args.arguments);
    if (!validation.valid) {
      await ctx.db.patch(toolCallId, {
        status: "failed",
        error: validation.error,
        completedAt: Date.now(),
      });

      await logAudit(
        ctx,
        args.orgId,
        "tool_validation_failed",
        args.conversationId,
        toolCallId,
        { error: validation.error }
      );

      await ctx.db.insert("tool_results", {
        toolCallId,
        orgId: args.orgId,
        conversationId: args.conversationId,
        toolName: args.toolName,
        result: null,
        success: false,
        error: validation.error,
        timestamp: Date.now(),
      });

      throw new Error(validation.error);
    }

    try {
      await ctx.db.patch(toolCallId, { status: "executing" });
      await logAudit(
        ctx,
        args.orgId,
        "tool_execution_started",
        args.conversationId,
        toolCallId
      );

      const startTime = Date.now();
      const result = await tool.execute(
        args.arguments,
        ctx,
        args.orgId,
        args.conversationId
      );
      const executionTimeMs = Date.now() - startTime;

      // Calculate cost (simplified)
      const costCents = 0.1; // Simplified, replace with real calculation

      await ctx.db.patch(toolCallId, {
        status: "completed",
        completedAt: Date.now(),
        cost: costCents,
      });

      await logAudit(
        ctx,
        args.orgId,
        "tool_execution_completed",
        args.conversationId,
        toolCallId,
        { executionTimeMs }
      );

      await ctx.db.insert("tool_results", {
        toolCallId,
        orgId: args.orgId,
        conversationId: args.conversationId,
        toolName: args.toolName,
        result,
        success: true,
        timestamp: Date.now(),
        executionTimeMs,
      });

      await updateCostMetrics(ctx, args.orgId, args.provider, args.model, costCents);
      await logAudit(ctx, args.orgId, "result_stored", args.conversationId, toolCallId);

      return { success: true, toolCallId, result };
    } catch (err: any) {
      await ctx.db.patch(toolCallId, {
        status: "fallback",
        error: err.message,
        completedAt: Date.now(),
      });

      await logAudit(
        ctx,
        args.orgId,
        "fallback_triggered",
        args.conversationId,
        toolCallId,
        { error: err.message }
      );

      await ctx.db.insert("tool_results", {
        toolCallId,
        orgId: args.orgId,
        conversationId: args.conversationId,
        toolName: args.toolName,
        result: null,
        success: false,
        error: err.message,
        timestamp: Date.now(),
      });

      throw err;
    }
  },
});

// ─── Get Tools Schema for OpenAI/Anthropic ─────────────────────────────────────
export const getToolsSchema = query({
  args: {},
  async handler(ctx: any, args: any) {
    return TOOLS.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  },
});

// ─── Get Tool Calls for Analytics ─────────────────────────────────────────────
export const getToolCalls = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  async handler(ctx: any, args: any) {
    let query = ctx.db
      .query("tool_calls")
      .withIndex("by_org_id", (q: any) => q.eq("orgId", args.orgId));

    // We'd apply date filters with a filter if we had a better index, or in app code
    const calls = await query.collect();
    return calls.sort((a: any, b: any) => b.startedAt - a.startedAt);
  },
});

// ─── Get Cost Metrics ─────────────────────────────────────────────────────────
export const getCostMetrics = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  async handler(ctx: any, args: any) {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const metrics = await ctx.db
      .query("cost_metrics")
      .withIndex("by_org_id", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    return metrics.filter((m: any) => new Date(m.date).getTime() > cutoff);
  },
});

// ─── Get Analytics Dashboard Data ────────────────────────────────────────────
export const getAnalyticsDashboard = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  async handler(ctx: any, args: any) {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const toolCalls = await ctx.db
      .query("tool_calls")
      .withIndex("by_org_id", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    const filteredCalls = toolCalls.filter((t: any) => t.startedAt > cutoff);

    const stats: any = {
      totalToolCalls: filteredCalls.length,
      completed: filteredCalls.filter((t: any) => t.status === "completed").length,
      failed: filteredCalls.filter((t: any) => t.status === "failed").length,
      fallback: filteredCalls.filter((t: any) => t.status === "fallback").length,
      byTool: {},
      totalCost: 0,
    };

    for (const call of filteredCalls) {
      if (stats.byTool[call.toolName]) {
        stats.byTool[call.toolName]++;
      } else {
        stats.byTool[call.toolName] = 1;
      }
      if (call.cost) {
        stats.totalCost += call.cost;
      }
    }

    const costMetrics = await ctx.db
      .query("cost_metrics")
      .withIndex("by_org_id", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    const filteredCosts = costMetrics.filter((m: any) => new Date(m.date).getTime() > cutoff);
    const byDate: any = {};
    const byProvider: any = {};

    for (const metric of filteredCosts) {
      if (!byDate[metric.date]) {
        byDate[metric.date] = 0;
      }
      byDate[metric.date] += metric.totalCost;

      if (!byProvider[metric.provider]) {
        byProvider[metric.provider] = { cost: 0, calls: 0 };
      }
      byProvider[metric.provider].cost += metric.totalCost;
      byProvider[metric.provider].calls += metric.totalCalls;
    }

    return {
      stats,
      byDate,
      byProvider,
    };
  },
});

// ─── Add Knowledge Base Item ─────────────────────────────────────────────────
export const addKnowledgeBaseItem = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  async handler(ctx: any, args: any) {
    const now = Date.now();
    return await ctx.db.insert("knowledge_base", {
      orgId: args.orgId,
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      createdAt: now,
      updatedAt: now,
    });
  },
});
