/**
 * Customer Activity Timeline - Email Logs Management
 * Handles email communication tracking
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get all email logs for a customer
 */
export const getCustomerEmails = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    direction: v.optional(v.union(v.literal("sent"), v.literal("received"))),
    status: v.optional(v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("failed")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let emails = await ctx.db
      .query("email_logs")
      .withIndex("by_customer_sent", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    // Filter by orgId
    emails = emails.filter(e => e.orgId === args.orgId);

    // Filter by direction
    if (args.direction) {
      emails = emails.filter(e => e.direction === args.direction);
    }

    // Filter by status
    if (args.status) {
      emails = emails.filter(e => e.status === args.status);
    }

    // Apply limit
    const limit = args.limit || 50;
    return emails.slice(0, limit);
  },
});

/**
 * Log an email
 */
export const logEmail = mutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    direction: v.union(v.literal("sent"), v.literal("received")),
    fromEmail: v.string(),
    toEmails: v.array(v.string()),
    ccEmails: v.optional(v.array(v.string())),
    bccEmails: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    agentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
    }))),
    externalId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const emailId = await ctx.db.insert("email_logs", {
      orgId: args.orgId,
      customerId: args.customerId,
      conversationId: args.conversationId,
      direction: args.direction,
      fromEmail: args.fromEmail,
      toEmails: args.toEmails,
      ccEmails: args.ccEmails,
      bccEmails: args.bccEmails,
      subject: args.subject,
      body: args.body,
      status: args.status,
      agentId: args.agentId,
      agentName: args.agentName,
      attachments: args.attachments,
      externalId: args.externalId,
      provider: args.provider,
      sentAt: now,
      deliveredAt: args.status === "delivered" ? now : undefined,
      openedAt: args.status === "opened" ? now : undefined,
    });

    // Create timeline event
    const title = args.direction === "sent" 
      ? "Email sent" 
      : "Email received";
    
    const description = args.subject;

    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: "email_sent",
      title,
      description,
      conversationId: args.conversationId,
      performedBy: args.agentId,
      performedByType: args.direction === "sent" ? "agent" : "customer",
      metadata: {
        emailId: emailId,
        direction: args.direction,
        status: args.status,
        subject: args.subject,
        fromEmail: args.fromEmail,
        toEmails: args.toEmails,
        hasAttachments: (args.attachments?.length || 0) > 0,
      },
      timestamp: now,
      isVisible: true,
    });

    return { emailId, success: true };
  },
});

/**
 * Update email status (for tracking opens, clicks, etc.)
 */
export const updateEmailStatus = mutation({
  args: {
    emailId: v.id("email_logs"),
    orgId: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    
    if (!email || email.orgId !== args.orgId) {
      throw new Error("Email log not found or access denied");
    }

    const now = Date.now();
    const updates: any = { status: args.status };

    if (args.status === "delivered" && !email.deliveredAt) {
      updates.deliveredAt = now;
    }
    if (args.status === "opened" && !email.openedAt) {
      updates.openedAt = now;
      updates.openCount = (email.openCount || 0) + 1;
    }
    if (args.status === "clicked" && !email.clickedAt) {
      updates.clickedAt = now;
    }
    if (args.status === "bounced" || args.status === "failed") {
      updates.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.emailId, updates);

    return { success: true };
  },
});

/**
 * Get email statistics
 */
export const getEmailStats = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    const emails = await ctx.db
      .query("email_logs")
      .withIndex("by_customer_sent", q =>
        q.eq("customerId", args.customerId)
      )
      .filter(q =>
        q.and(
          q.eq(q.field("orgId"), args.orgId),
          q.gte(q.field("sentAt"), cutoffDate)
        )
      )
      .collect();

    const sent = emails.filter(e => e.direction === "sent").length;
    const received = emails.filter(e => e.direction === "received").length;
    const delivered = emails.filter(e => e.status === "delivered" || e.status === "opened").length;
    const opened = emails.filter(e => e.status === "opened" || e.status === "clicked").length;
    const clicked = emails.filter(e => e.status === "clicked").length;
    const bounced = emails.filter(e => e.status === "bounced").length;
    const failed = emails.filter(e => e.status === "failed").length;

    const sentEmails = emails.filter(e => e.direction === "sent");
    const openRate = sentEmails.length > 0 ? (opened / sentEmails.length) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = sentEmails.length > 0 ? (bounced / sentEmails.length) * 100 : 0;

    return {
      total: emails.length,
      sent,
      received,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      openRate,
      clickRate,
      bounceRate,
    };
  },
});

/**
 * Get email thread (conversation)
 */
export const getEmailThread = query({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("email_logs")
      .withIndex("by_conversation_sent", q =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return emails.filter(e => e.orgId === args.orgId);
  },
});

/**
 * Search emails
 */
export const searchEmails = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("email_logs")
      .withIndex("by_customer_sent", q =>
        q.eq("customerId", args.customerId)
      )
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    
    return emails.filter(e =>
      e.orgId === args.orgId &&
      (
        e.subject.toLowerCase().includes(searchLower) ||
        e.body.toLowerCase().includes(searchLower) ||
        e.fromEmail.toLowerCase().includes(searchLower) ||
        e.toEmails.some(email => email.toLowerCase().includes(searchLower))
      )
    );
  },
});

/**
 * Get recent emails
 */
export const getRecentEmails = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    const emails = await ctx.db
      .query("email_logs")
      .withIndex("by_customer_sent", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    return emails.filter(e => e.orgId === args.orgId).slice(0, limit);
  },
});

/**
 * Delete email log
 */
export const deleteEmailLog = mutation({
  args: {
    emailId: v.id("email_logs"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    
    if (!email || email.orgId !== args.orgId) {
      throw new Error("Email log not found or access denied");
    }

    await ctx.db.delete(args.emailId);

    return { success: true };
  },
});

/**
 * Get email with full details
 */
export const getEmailDetails = query({
  args: {
    emailId: v.id("email_logs"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    
    if (!email || email.orgId !== args.orgId) {
      return null;
    }

    return email;
  },
});
