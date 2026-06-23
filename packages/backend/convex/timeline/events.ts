/**
 * Customer Activity Timeline - Events Management
 * Handles activity event creation, retrieval, and search
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get customer timeline with pagination and filters
 */
export const getCustomerTimeline = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    eventTypes: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    paginationId: v.optional(v.id("activity_events")),
  },
  handler: async (ctx, args) => {
    // Start with base query
    let query = ctx.db
      .query("activity_events")
      .withIndex("by_customer_timestamp", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc");

    // Collect all events
    let events = await query.collect();

    // Apply filters
    if (args.eventTypes && args.eventTypes.length > 0) {
      events = events.filter(e => args.eventTypes!.includes(e.eventType));
    }

    if (args.startDate) {
      events = events.filter(e => e.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      events = events.filter(e => e.timestamp <= args.endDate!);
    }

    // Filter by orgId
    events = events.filter(e => e.orgId === args.orgId);

    // Handle pagination
    if (args.paginationId) {
      const lastEvent = await ctx.db.get(args.paginationId);
      if (lastEvent) {
        events = events.filter(e => e.timestamp < lastEvent.timestamp);
      }
    }

    // Apply limit
    const limit = args.limit || 50;
    const paginatedEvents = events.slice(0, limit);

    // Enrich with related data
    const enriched = await Promise.all(
      paginatedEvents.map(async (event) => {
        let relatedData: any = {};

        // Get conversation data if available
        if (event.conversationId) {
          const conversation = await ctx.db.get(event.conversationId);
          relatedData.conversation = conversation ? {
            id: conversation._id,
            status: conversation.status,
            channelType: conversation.channelType,
          } : null;
        }

        // Get message data if available
        if (event.messageId) {
          const message = await ctx.db.get(event.messageId);
          relatedData.message = message ? {
            id: message._id,
            content: message.content.substring(0, 100),
            senderType: message.senderType,
          } : null;
        }

        return {
          ...event,
          ...relatedData,
        };
      })
    );

    return {
      events: enriched,
      hasMore: events.length > limit,
      nextCursor: enriched.length > 0 ? enriched[enriched.length - 1]._id : null,
    };
  },
});

/**
 * Create a new activity event
 */
export const createActivityEvent = mutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    eventType: v.union(
      v.literal("message_sent"),
      v.literal("message_received"),
      v.literal("conversation_started"),
      v.literal("conversation_resolved"),
      v.literal("note_added"),
      v.literal("tag_added"),
      v.literal("tag_removed"),
      v.literal("assigned"),
      v.literal("transferred"),
      v.literal("status_changed"),
      v.literal("priority_changed"),
      v.literal("sentiment_detected"),
      v.literal("call_made"),
      v.literal("email_sent")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.optional(v.id("unified_messages")),
    performedBy: v.optional(v.string()),
    performedByType: v.optional(v.union(
      v.literal("agent"),
      v.literal("bot"),
      v.literal("system"),
      v.literal("customer")
    )),
    metadata: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: args.eventType,
      title: args.title,
      description: args.description,
      conversationId: args.conversationId,
      messageId: args.messageId,
      performedBy: args.performedBy,
      performedByType: args.performedByType,
      metadata: args.metadata,
      timestamp: Date.now(),
      isVisible: true,
    });

    return { eventId, success: true };
  },
});

/**
 * Search timeline events
 */
export const searchTimeline = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("activity_events")
      .withIndex("by_customer_timestamp", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    // Filter by orgId and search term
    const searchLower = args.searchTerm.toLowerCase();
    const filtered = events.filter(e =>
      e.orgId === args.orgId &&
      (
        e.title.toLowerCase().includes(searchLower) ||
        (e.description && e.description.toLowerCase().includes(searchLower))
      )
    );

    const limit = args.limit || 50;
    return filtered.slice(0, limit);
  },
});

/**
 * Get timeline statistics
 */
export const getTimelineStats = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    const events = await ctx.db
      .query("activity_events")
      .withIndex("by_customer_timestamp", q =>
        q.eq("customerId", args.customerId)
      )
      .filter(q =>
        q.and(
          q.eq(q.field("orgId"), args.orgId),
          q.gte(q.field("timestamp"), cutoffDate)
        )
      )
      .collect();

    // Count by event type
    const byType: Record<string, number> = {};
    events.forEach(e => {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    });

    // Count by day
    const byDay: Record<string, number> = {};
    events.forEach(e => {
      const date = new Date(e.timestamp).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      byType,
      byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      firstEvent: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : null,
      lastEvent: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : null,
    };
  },
});

/**
 * Export timeline to JSON
 */
export const exportTimeline = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    format: v.optional(v.union(v.literal("json"), v.literal("csv"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db
      .query("activity_events")
      .withIndex("by_customer_timestamp", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    // Apply filters
    events = events.filter(e => e.orgId === args.orgId);

    if (args.startDate) {
      events = events.filter(e => e.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      events = events.filter(e => e.timestamp <= args.endDate!);
    }

    // Format data
    const format = args.format || "json";
    
    if (format === "csv") {
      const headers = ["Date", "Event Type", "Title", "Description", "Performed By"];
      const rows = events.map(e => [
        new Date(e.timestamp).toISOString(),
        e.eventType,
        e.title,
        e.description || "",
        e.performedBy || "System",
      ]);

      return {
        format: "csv",
        data: [headers, ...rows],
      };
    }

    return {
      format: "json",
      data: events.map(e => ({
        id: e._id,
        timestamp: e.timestamp,
        date: new Date(e.timestamp).toISOString(),
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        performedBy: e.performedBy,
        performedByType: e.performedByType,
        metadata: e.metadata,
      })),
    };
  },
});

/**
 * Update event visibility (for hiding/showing events)
 */
export const updateEventVisibility = mutation({
  args: {
    eventId: v.id("activity_events"),
    orgId: v.string(),
    isVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    
    if (!event || event.orgId !== args.orgId) {
      throw new Error("Event not found or access denied");
    }

    await ctx.db.patch(args.eventId, {
      isVisible: args.isVisible,
    });

    return { success: true };
  },
});

/**
 * Delete an activity event
 */
export const deleteEvent = mutation({
  args: {
    eventId: v.id("activity_events"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    
    if (!event || event.orgId !== args.orgId) {
      throw new Error("Event not found or access denied");
    }

    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});

/**
 * Auto-log message activity (called by message system)
 */
export const logMessageActivity = internalMutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.id("unified_conversations"),
    messageId: v.id("unified_messages"),
    eventType: v.union(v.literal("message_sent"), v.literal("message_received")),
    senderType: v.string(),
    senderId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const title = args.eventType === "message_sent" 
      ? "Message sent" 
      : "Message received";

    const description = args.content.length > 100 
      ? args.content.substring(0, 100) + "..."
      : args.content;

    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: args.eventType,
      title,
      description,
      conversationId: args.conversationId,
      messageId: args.messageId,
      performedBy: args.senderId,
      performedByType: args.senderType as any,
      timestamp: Date.now(),
      isVisible: true,
    });
  },
});

/**
 * Auto-log conversation status change
 */
export const logStatusChange = internalMutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.id("unified_conversations"),
    oldStatus: v.string(),
    newStatus: v.string(),
    changedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: "status_changed",
      title: "Conversation status changed",
      description: `Status changed from ${args.oldStatus} to ${args.newStatus}`,
      conversationId: args.conversationId,
      performedBy: args.changedBy,
      performedByType: args.changedBy ? "agent" : "system",
      metadata: {
        oldStatus: args.oldStatus,
        newStatus: args.newStatus,
      },
      timestamp: Date.now(),
      isVisible: true,
    });
  },
});

/**
 * Auto-log sentiment detection
 */
export const logSentimentDetection = internalMutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.id("unified_conversations"),
    messageId: v.id("unified_messages"),
    sentiment: v.string(),
    sentimentScore: v.number(),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: "sentiment_detected",
      title: `${args.sentiment} sentiment detected`,
      description: `Intent: ${args.intent} (Score: ${args.sentimentScore.toFixed(2)})`,
      conversationId: args.conversationId,
      messageId: args.messageId,
      performedByType: "system",
      metadata: {
        sentiment: args.sentiment,
        sentimentScore: args.sentimentScore,
        intent: args.intent,
      },
      timestamp: Date.now(),
      isVisible: true,
    });
  },
});
