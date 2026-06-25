// @ts-nocheck
/**
 * Sentiment Rules Management
 * Create and manage auto-trigger rules
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create a sentiment rule
 */
export const createRule = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priority: v.number(),
    conditions: v.object({
      sentiments: v.optional(v.array(v.string())),
      intents: v.optional(v.array(v.string())),
      minSentimentScore: v.optional(v.number()),
      maxSentimentScore: v.optional(v.number()),
      minConfidence: v.optional(v.number()),
      consecutiveNegative: v.optional(v.number()),
      customerTier: v.optional(v.array(v.string())),
    }),
    actions: v.object({
      triggerHandoff: v.boolean(),
      increasePriority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
      routeToVIP: v.boolean(),
      notifyTeam: v.optional(v.array(v.string())),
      addTags: v.optional(v.array(v.string())),
      assignTo: v.optional(v.string()),
    }),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const ruleId = await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      isActive: true,
      priority: args.priority,
      conditions: args.conditions,
      actions: args.actions,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    });

    return { ruleId, success: true };
  },
});

/**
 * Get all rules for an organization
 */
export const getRules = query({
  args: {
    orgId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("sentiment_rules")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId));

    if (args.activeOnly) {
      query = query.filter(q => q.eq(q.field("isActive"), true));
    }

    const rules = await query.order("desc").collect();
    return rules;
  },
});

/**
 * Update a rule
 */
export const updateRule = mutation({
  args: {
    ruleId: v.id("sentiment_rules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    conditions: v.optional(v.object({
      sentiments: v.optional(v.array(v.string())),
      intents: v.optional(v.array(v.string())),
      minSentimentScore: v.optional(v.number()),
      maxSentimentScore: v.optional(v.number()),
      minConfidence: v.optional(v.number()),
      consecutiveNegative: v.optional(v.number()),
      customerTier: v.optional(v.array(v.string())),
    })),
    actions: v.optional(v.object({
      triggerHandoff: v.boolean(),
      increasePriority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
      routeToVIP: v.boolean(),
      notifyTeam: v.optional(v.array(v.string())),
      addTags: v.optional(v.array(v.string())),
      assignTo: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { ruleId, ...updates } = args;

    await ctx.db.patch(ruleId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a rule
 */
export const deleteRule = mutation({
  args: {
    ruleId: v.id("sentiment_rules"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.ruleId);
    return { success: true };
  },
});

/**
 * Create default rules for a new organization
 */
export const createDefaultRules = mutation({
  args: {
    orgId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rules = [];

    // Rule 1: Angry customers → immediate handoff
    rules.push(await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: "Angry Customer - Immediate Handoff",
      description: "Trigger human handoff for angry customers",
      isActive: true,
      priority: 100,
      conditions: {
        sentiments: ["angry", "frustrated"],
        minConfidence: 0.7,
      },
      actions: {
        triggerHandoff: true,
        increasePriority: "high",
        routeToVIP: false,
        addTags: ["urgent", "angry-customer"],
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    }));

    // Rule 2: Refund requests → high priority
    rules.push(await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: "Refund Request - Priority Increase",
      description: "Increase priority for refund requests",
      isActive: true,
      priority: 90,
      conditions: {
        intents: ["refund"],
        minConfidence: 0.75,
      },
      actions: {
        triggerHandoff: false,
        increasePriority: "high",
        routeToVIP: false,
        addTags: ["refund"],
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    }));

    // Rule 3: Consecutive negative → handoff
    rules.push(await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: "3 Consecutive Negative - Handoff",
      description: "Trigger handoff after 3 consecutive negative messages",
      isActive: true,
      priority: 85,
      conditions: {
        consecutiveNegative: 3,
      },
      actions: {
        triggerHandoff: true,
        increasePriority: "high",
        routeToVIP: false,
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    }));

    // Rule 4: Technical issues → priority
    rules.push(await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: "Technical Issue - Priority",
      description: "Increase priority for technical issues",
      isActive: true,
      priority: 70,
      conditions: {
        intents: ["technical_issue"],
        sentiments: ["urgent", "frustrated"],
      },
      actions: {
        triggerHandoff: false,
        increasePriority: "medium",
        routeToVIP: false,
        addTags: ["technical"],
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    }));

    // Rule 5: VIP routing for urgent pricing
    rules.push(await ctx.db.insert("sentiment_rules", {
      orgId: args.orgId,
      name: "Urgent Pricing - VIP Route",
      description: "Route urgent pricing questions to VIP queue",
      isActive: true,
      priority: 60,
      conditions: {
        intents: ["pricing"],
        sentiments: ["urgent"],
        customerTier: ["vip", "premium"],
      },
      actions: {
        triggerHandoff: false,
        routeToVIP: true,
        increasePriority: "high",
      },
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
    }));

    return { rulesCreated: rules.length, ruleIds: rules };
  },
});

/**
 * Get rule execution statistics
 */
export const getRuleStats = query({
  args: {
    orgId: v.string(),
    ruleId: v.optional(v.id("sentiment_rules")),
  },
  handler: async (ctx, args) => {
    if (args.ruleId) {
      const rule = await ctx.db.get(args.ruleId);
      return rule ? {
        executionCount: rule.executionCount,
        lastExecutedAt: rule.lastExecutedAt,
      } : null;
    }

    const rules = await ctx.db
      .query("sentiment_rules")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    return rules.map(rule => ({
      ruleId: rule._id,
      name: rule.name,
      executionCount: rule.executionCount,
      lastExecutedAt: rule.lastExecutedAt,
      isActive: rule.isActive,
    }));
  },
});
