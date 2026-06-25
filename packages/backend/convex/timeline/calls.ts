// @ts-nocheck
/**
 * Customer Activity Timeline - Call Logs Management
 * Handles phone call tracking and logging
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get all call logs for a customer
 */
export const getCustomerCalls = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    direction: v.optional(v.union(v.literal("inbound"), v.literal("outbound"))),
    status: v.optional(v.union(
      v.literal("completed"),
      v.literal("missed"),
      v.literal("voicemail"),
      v.literal("failed"),
      v.literal("busy"),
      v.literal("no_answer")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let calls = await ctx.db
      .query("call_logs")
      .withIndex("by_customer_called", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    // Filter by orgId
    calls = calls.filter(c => c.orgId === args.orgId);

    // Filter by direction
    if (args.direction) {
      calls = calls.filter(c => c.direction === args.direction);
    }

    // Filter by status
    if (args.status) {
      calls = calls.filter(c => c.status === args.status);
    }

    // Apply limit
    const limit = args.limit || 50;
    return calls.slice(0, limit);
  },
});

/**
 * Create a new call log
 */
export const logCall = mutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    phoneNumber: v.string(),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    status: v.union(
      v.literal("completed"),
      v.literal("missed"),
      v.literal("voicemail"),
      v.literal("failed"),
      v.literal("busy"),
      v.literal("no_answer")
    ),
    durationSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    transcription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const callId = await ctx.db.insert("call_logs", {
      orgId: args.orgId,
      customerId: args.customerId,
      conversationId: args.conversationId,
      direction: args.direction,
      phoneNumber: args.phoneNumber,
      agentId: args.agentId,
      agentName: args.agentName,
      status: args.status,
      durationSeconds: args.durationSeconds,
      notes: args.notes,
      recordingUrl: args.recordingUrl,
      transcription: args.transcription,
      tags: args.tags || [],
      calledAt: now,
    });

    // Create timeline event
    const title = args.direction === "inbound" 
      ? "Incoming call" 
      : "Outgoing call";
    
    const description = `${args.status} - ${args.durationSeconds ? `${Math.floor(args.durationSeconds / 60)}m ${args.durationSeconds % 60}s` : "0s"}`;

    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: "call_made",
      title,
      description,
      conversationId: args.conversationId,
      performedBy: args.agentId,
      performedByType: "agent",
      metadata: {
        callId: callId,
        direction: args.direction,
        status: args.status,
        durationSeconds: args.durationSeconds,
        phoneNumber: args.phoneNumber,
      },
      timestamp: now,
      isVisible: true,
    });

    return { callId, success: true };
  },
});

/**
 * Update call log
 */
export const updateCallLog = mutation({
  args: {
    callId: v.id("call_logs"),
    orgId: v.string(),
    notes: v.optional(v.string()),
    transcription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    
    if (!call || call.orgId !== args.orgId) {
      throw new Error("Call log not found or access denied");
    }

    const updates: any = {};
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.transcription !== undefined) updates.transcription = args.transcription;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.durationSeconds !== undefined) updates.durationSeconds = args.durationSeconds;

    await ctx.db.patch(args.callId, updates);

    return { success: true };
  },
});

/**
 * Get call statistics
 */
export const getCallStats = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    const calls = await ctx.db
      .query("call_logs")
      .withIndex("by_customer_called", q =>
        q.eq("customerId", args.customerId)
      )
      .filter(q =>
        q.and(
          q.eq(q.field("orgId"), args.orgId),
          q.gte(q.field("calledAt"), cutoffDate)
        )
      )
      .collect();

    const inbound = calls.filter(c => c.direction === "inbound").length;
    const outbound = calls.filter(c => c.direction === "outbound").length;
    const completed = calls.filter(c => c.status === "completed").length;
    const missed = calls.filter(c => c.status === "missed").length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
    const avgDuration = completed > 0 
      ? calls.filter(c => c.status === "completed").reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / completed
      : 0;

    return {
      total: calls.length,
      inbound,
      outbound,
      completed,
      missed,
      totalDurationSeconds: totalDuration,
      avgDurationSeconds: Math.round(avgDuration),
      completionRate: calls.length > 0 ? (completed / calls.length) * 100 : 0,
    };
  },
});

/**
 * Get recent calls
 */
export const getRecentCalls = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    const calls = await ctx.db
      .query("call_logs")
      .withIndex("by_customer_called", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    return calls.filter(c => c.orgId === args.orgId).slice(0, limit);
  },
});

/**
 * Search call logs
 */
export const searchCalls = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("call_logs")
      .withIndex("by_customer_called", q =>
        q.eq("customerId", args.customerId)
      )
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    
    return calls.filter(c =>
      c.orgId === args.orgId &&
      (
        c.phoneNumber.includes(args.searchTerm) ||
        (c.notes && c.notes.toLowerCase().includes(searchLower)) ||
        (c.transcription && c.transcription.toLowerCase().includes(searchLower)) ||
        (c.agentName && c.agentName.toLowerCase().includes(searchLower))
      )
    );
  },
});

/**
 * Delete call log
 */
export const deleteCallLog = mutation({
  args: {
    callId: v.id("call_logs"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    
    if (!call || call.orgId !== args.orgId) {
      throw new Error("Call log not found or access denied");
    }

    await ctx.db.delete(args.callId);

    return { success: true };
  },
});
