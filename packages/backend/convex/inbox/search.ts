/**
 * Unified Inbox - Search Index Management
 * Handles full-text search indexing for conversations
 */

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Update search index for a conversation
 */
export const updateSearchIndex = internalMutation({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    // Get all messages for the conversation
    const messages = await ctx.db
      .query("unified_messages")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .collect();

    // Get customer data
    const customer = await ctx.db.get(conversation.customerId);

    // Build search content
    const messageContent = messages.map(m => m.content).join(" ");
    const customerInfo = customer
      ? `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""}`.trim()
      : "";

    const searchableContent = `${messageContent} ${customerInfo} ${conversation.tags.join(" ")}`;

    // Check if index exists
    const existingIndex = await ctx.db
      .query("conversation_search_index")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .first();

    if (existingIndex) {
      // Update existing index
      await ctx.db.patch(existingIndex._id, {
        searchableText: searchableContent,
        messageCount: messages.length,
        lastMessageAt: conversation.lastMessageAt,
        updatedAt: Date.now(),
      });
    } else {
      // Create new index
      await ctx.db.insert("conversation_search_index", {
        orgId: conversation.orgId,
        conversationId: args.conversationId,
        customerId: conversation.customerId,
        searchableText: searchableContent,
        messageCount: messages.length,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Search conversations by text
 */
export const searchConversations = query({
  args: {
    orgId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.searchTerm.length < 2) {
      return [];
    }

    const searchLower = args.searchTerm.toLowerCase();
    const limit = args.limit || 50;

    // Get all search indexes for the org
    const indexes = await ctx.db
      .query("conversation_search_index")
      .withIndex("by_org_updated", q => q.eq("orgId", args.orgId))
      .collect();

    // Filter by search term
    const filtered = indexes.filter(idx =>
      idx.searchableContent.toLowerCase().includes(searchLower)
    );

    // Sort by relevance (last message time)
    filtered.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Get conversation details
    const results = await Promise.all(
      filtered.slice(0, limit).map(async (idx) => {
        const conversation = await ctx.db.get(idx.conversationId);
        const customer = await ctx.db.get(idx.customerId);
        return {
          conversation,
          customer,
          messageCount: idx.messageCount,
        };
      })
    );

    return results.filter(r => r.conversation !== null);
  },
});

/**
 * Rebuild search index for all conversations (maintenance)
 */
export const rebuildSearchIndex = internalMutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("unified_conversations")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    let updatedCount = 0;

    for (const conversation of conversations) {
      await ctx.scheduler.runAfter(0, internal.inbox.search.updateSearchIndex, {
        conversationId: conversation._id,
      });
      updatedCount++;
    }

    return { updatedCount };
  },
});
