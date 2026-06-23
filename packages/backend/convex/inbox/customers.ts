/**
 * Unified Inbox - Customer Profile Management
 * Merge customer identities across channels
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get or create unified customer
 */
export const getOrCreateCustomer = mutation({
  args: {
    orgId: v.string(),
    channelId: v.id("channels"),
    channelType: v.string(),
    externalId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find existing customer by email or phone
    let customer = null;

    if (args.email) {
      customer = await ctx.db
        .query("unified_customers")
        .withIndex("by_org_email", q =>
          q.eq("orgId", args.orgId).eq("email", args.email)
        )
        .first();
    }

    if (!customer && args.phone) {
      customer = await ctx.db
        .query("unified_customers")
        .withIndex("by_org_phone", q =>
          q.eq("orgId", args.orgId).eq("phone", args.phone)
        )
        .first();
    }

    const now = Date.now();

    if (customer) {
      // Check if this channel identity already exists
      const hasIdentity = customer.channelIdentities.some(
        id => id.channelId === args.channelId && id.externalId === args.externalId
      );

      if (!hasIdentity) {
        // Add new channel identity
        await ctx.db.patch(customer._id, {
          channelIdentities: [
            ...customer.channelIdentities,
            {
              channelId: args.channelId,
              channelType: args.channelType,
              externalId: args.externalId,
              username: args.username,
            },
          ],
          lastSeenAt: now,
          lastChannelUsed: args.channelId,
          updatedAt: now,
        });
      }

      return customer._id;
    }

    // Create new customer
    const customerId = await ctx.db.insert("unified_customers", {
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      avatar: args.avatar,
      channelIdentities: [
        {
          channelId: args.channelId,
          channelType: args.channelType,
          externalId: args.externalId,
          username: args.username,
        },
      ],
      tags: [],
      totalConversations: 0,
      totalMessages: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      lastChannelUsed: args.channelId,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
    });

    return customerId;
  },
});

/**
 * Get customer profile with conversation history
 */
export const getCustomerProfile = query({
  args: {
    customerId: v.id("unified_customers"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;

    // Get all conversations
    const conversations = await ctx.db
      .query("unified_conversations")
      .withIndex("by_customer_id", q => q.eq("customerId", args.customerId))
      .order("desc")
      .collect();

    // Get channels used
    const channelIds = [...new Set(customer.channelIdentities.map(ci => ci.channelId))];
    const channels = await Promise.all(
      channelIds.map(id => ctx.db.get(id))
    );

    // Calculate statistics
    const stats = {
      totalConversations: conversations.length,
      openConversations: conversations.filter(c => c.status === "open").length,
      resolvedConversations: conversations.filter(c => c.status === "resolved").length,
      avgResponseTime: conversations
        .filter(c => c.firstResponseTimeMs)
        .reduce((sum, c) => sum + (c.firstResponseTimeMs || 0), 0) / conversations.length || 0,
    };

    return {
      ...customer,
      conversations: conversations.slice(0, 10), // Latest 10
      channels: channels.filter(Boolean),
      stats,
    };
  },
});

/**
 * Update customer profile
 */
export const updateCustomer = mutation({
  args: {
    customerId: v.id("unified_customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    tier: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    const { customerId, ...updates } = args;

    await ctx.db.patch(customerId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return { success: true };
  },
});

/**
 * Merge two customers
 */
export const mergeCustomers = mutation({
  args: {
    primaryCustomerId: v.id("unified_customers"),
    secondaryCustomerId: v.id("unified_customers"),
  },
  handler: async (ctx, args) => {
    const primary = await ctx.db.get(args.primaryCustomerId);
    const secondary = await ctx.db.get(args.secondaryCustomerId);

    if (!primary || !secondary) {
      throw new Error("Customer not found");
    }

    // Merge channel identities
    const mergedIdentities = [
      ...primary.channelIdentities,
      ...secondary.channelIdentities,
    ];

    // Remove duplicates
    const uniqueIdentities = mergedIdentities.filter(
      (identity, index, self) =>
        index ===
        self.findIndex(
          t => t.channelId === identity.channelId && t.externalId === identity.externalId
        )
    );

    // Merge tags
    const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];

    // Update primary customer
    await ctx.db.patch(args.primaryCustomerId, {
      channelIdentities: uniqueIdentities,
      tags: mergedTags,
      totalConversations: primary.totalConversations + secondary.totalConversations,
      totalMessages: primary.totalMessages + secondary.totalMessages,
      email: primary.email || secondary.email,
      phone: primary.phone || secondary.phone,
      company: primary.company || secondary.company,
      updatedAt: Date.now(),
    });

    // Move all conversations from secondary to primary
    const secondaryConversations = await ctx.db
      .query("unified_conversations")
      .withIndex("by_customer_id", q => q.eq("customerId", args.secondaryCustomerId))
      .collect();

    for (const conversation of secondaryConversations) {
      await ctx.db.patch(conversation._id, {
        customerId: args.primaryCustomerId,
        customerName: primary.name,
        customerEmail: primary.email,
        customerPhone: primary.phone,
        updatedAt: Date.now(),
      });
    }

    // Delete secondary customer
    await ctx.db.delete(args.secondaryCustomerId);

    return { success: true };
  },
});

/**
 * Search customers
 */
export const searchCustomers = query({
  args: {
    orgId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const queryLower = args.query.toLowerCase();

    const customers = await ctx.db
      .query("unified_customers")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Filter by query
    const filtered = customers.filter(customer => {
      return (
        customer.name.toLowerCase().includes(queryLower) ||
        customer.email?.toLowerCase().includes(queryLower) ||
        customer.phone?.includes(args.query) ||
        customer.company?.toLowerCase().includes(queryLower)
      );
    });

    return filtered.slice(0, limit);
  },
});

/**
 * Block/unblock customer
 */
export const toggleBlockCustomer = mutation({
  args: {
    customerId: v.id("unified_customers"),
    isBlocked: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.customerId, {
      isBlocked: args.isBlocked,
      blockedReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
