// @ts-nocheck
/**
 * Internal Collaboration - Tags Management
 * Handles tag creation, usage tracking, and organization
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create or get a tag
 */
export const createTag = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if tag already exists
    const existing = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_name", q =>
        q.eq("orgId", args.orgId).eq("name", args.name)
      )
      .first();

    if (existing) {
      return { tagId: existing._id, exists: true };
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("collaboration_tags", {
      orgId: args.orgId,
      name: args.name,
      color: args.color,
      description: args.description,
      category: args.category,
      usageCount: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return { tagId, exists: false };
  },
});

/**
 * Get all tags for an organization
 */
export const getTags = query({
  args: {
    orgId: v.string(),
    category: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("name"), v.literal("usage"), v.literal("created"))),
  },
  handler: async (ctx, args) => {
    let tags = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Filter by category
    if (args.category) {
      tags = tags.filter(t => t.category === args.category);
    }

    // Sort
    const sortBy = args.sortBy || "usage";
    tags.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "usage":
          return b.usageCount - a.usageCount;
        case "created":
          return b.createdAt - a.createdAt;
        default:
          return 0;
      }
    });

    return tags;
  },
});

/**
 * Get tag by name
 */
export const getTagByName = query({
  args: {
    orgId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_name", q =>
        q.eq("orgId", args.orgId).eq("name", args.name)
      )
      .first();
  },
});

/**
 * Update tag
 */
export const updateTag = mutation({
  args: {
    tagId: v.id("collaboration_tags"),
    orgId: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    
    if (!tag || tag.orgId !== args.orgId) {
      throw new Error("Tag not found or access denied");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.color) updates.color = args.color;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;

    await ctx.db.patch(args.tagId, updates);

    return { success: true };
  },
});

/**
 * Delete tag
 */
export const deleteTag = mutation({
  args: {
    tagId: v.id("collaboration_tags"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.tagId);
    
    if (!tag || tag.orgId !== args.orgId) {
      throw new Error("Tag not found or access denied");
    }

    await ctx.db.delete(args.tagId);

    return { success: true };
  },
});

/**
 * Increment tag usage (internal)
 */
export const incrementTagUsage = internalMutation({
  args: {
    orgId: v.string(),
    tagName: v.string(),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_name", q =>
        q.eq("orgId", args.orgId).eq("name", args.tagName)
      )
      .first();

    if (tag) {
      await ctx.db.patch(tag._id, {
        usageCount: tag.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Decrement tag usage (internal)
 */
export const decrementTagUsage = internalMutation({
  args: {
    orgId: v.string(),
    tagName: v.string(),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_name", q =>
        q.eq("orgId", args.orgId).eq("name", args.tagName)
      )
      .first();

    if (tag && tag.usageCount > 0) {
      await ctx.db.patch(tag._id, {
        usageCount: tag.usageCount - 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Get popular tags
 */
export const getPopularTags = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    // Sort by usage
    tags.sort((a, b) => b.usageCount - a.usageCount);

    const limit = args.limit || 10;
    return tags.slice(0, limit);
  },
});

/**
 * Search tags
 */
export const searchTags = query({
  args: {
    orgId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    const filtered = tags.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      (t.description && t.description.toLowerCase().includes(searchLower))
    );

    const limit = args.limit || 20;
    return filtered.slice(0, limit);
  },
});

/**
 * Get tag categories
 */
export const getTagCategories = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("collaboration_tags")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    const categories = new Set<string>();
    tags.forEach(tag => {
      if (tag.category) {
        categories.add(tag.category);
      }
    });

    return Array.from(categories).sort();
  },
});
