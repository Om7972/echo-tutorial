// @ts-nocheck
/**
 * Email Support - Threading
 * Email thread management and conversation grouping
 */

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create email thread (internal)
 */
export const createThread = internalMutation({
  args: {
    orgId: v.string(),
    threadId: v.string(),
    subject: v.string(),
    participants: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    conversationId: v.optional(v.id("unified_conversations")),
  },
  handler: async (ctx, args) => {
    const threadDocId = await ctx.db.insert("email_threads", {
      orgId: args.orgId,
      threadId: args.threadId,
      conversationId: args.conversationId,
      subject: args.subject,
      participants: args.participants,
      messageCount: 1,
      lastMessageAt: Date.now(),
      isRead: false,
      isStarred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return threadDocId;
  },
});

/**
 * Update email thread (internal)
 */
export const updateThread = internalMutation({
  args: {
    threadId: v.string(),
    orgId: v.string(),
    subject: v.string(),
    participants: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("email_threads")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .first();

    if (thread) {
      // Merge participants
      const existingEmails = new Set(thread.participants.map((p) => p.email));
      const newParticipants = args.participants.filter(
        (p) => !existingEmails.has(p.email)
      );

      await ctx.db.patch(thread._id, {
        participants: [...thread.participants, ...newParticipants],
        messageCount: thread.messageCount + 1,
        lastMessageAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Create new thread
      await ctx.db.insert("email_threads", {
        orgId: args.orgId,
        threadId: args.threadId,
        subject: args.subject,
        participants: args.participants,
        messageCount: 1,
        lastMessageAt: Date.now(),
        isRead: false,
        isStarred: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get threads
 */
export const getThreads = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("email_threads")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.limit || 50);

    return threads;
  },
});

/**
 * Get thread by ID
 */
export const getThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("email_threads")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .first();
  },
});
