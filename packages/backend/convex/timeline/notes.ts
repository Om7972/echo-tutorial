// @ts-nocheck
/**
 * Customer Activity Timeline - Notes Management
 * Handles customer notes CRUD operations
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get all notes for a customer
 */
export const getCustomerNotes = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("activity_notes")
      .withIndex("by_customer_created", q =>
        q.eq("customerId", args.customerId)
      )
      .order("desc")
      .collect();

    // Filter by orgId
    const filtered = notes.filter(n => n.orgId === args.orgId);

    // Apply limit
    const limit = args.limit || 100;
    return filtered.slice(0, limit);
  },
});

/**
 * Create a new customer note
 */
export const createNote = mutation({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    conversationId: v.optional(v.id("unified_conversations")),
    note: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    isPinned: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const noteId = await ctx.db.insert("activity_notes", {
      orgId: args.orgId,
      customerId: args.customerId,
      conversationId: args.conversationId,
      note: args.note,
      authorId: args.authorId,
      authorName: args.authorName,
      isPinned: args.isPinned || false,
      category: args.category,
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });

    // Create timeline event
    await ctx.db.insert("activity_events", {
      orgId: args.orgId,
      customerId: args.customerId,
      eventType: "note_added",
      title: "Note added",
      description: args.note.length > 100 
        ? args.note.substring(0, 100) + "..."
        : args.note,
      conversationId: args.conversationId,
      performedBy: args.authorId,
      performedByType: "agent",
      metadata: {
        noteId: noteId,
        category: args.category,
      },
      timestamp: now,
      isVisible: true,
    });

    return { noteId, success: true };
  },
});

/**
 * Update a note
 */
export const updateNote = mutation({
  args: {
    noteId: v.id("activity_notes"),
    orgId: v.string(),
    note: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existingNote = await ctx.db.get(args.noteId);
    
    if (!existingNote || existingNote.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    await ctx.db.patch(args.noteId, {
      note: args.note,
      category: args.category,
      tags: args.tags,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a note
 */
export const deleteNote = mutation({
  args: {
    noteId: v.id("activity_notes"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    await ctx.db.delete(args.noteId);

    return { success: true };
  },
});

/**
 * Toggle note pin status
 */
export const togglePin = mutation({
  args: {
    noteId: v.id("activity_notes"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    await ctx.db.patch(args.noteId, {
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });

    return { isPinned: !note.isPinned, success: true };
  },
});

/**
 * Get pinned notes for a customer
 */
export const getPinnedNotes = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("activity_notes")
      .withIndex("by_customer_pinned", q =>
        q.eq("customerId", args.customerId).eq("isPinned", true)
      )
      .order("desc")
      .collect();

    return notes.filter(n => n.orgId === args.orgId);
  },
});

/**
 * Search notes
 */
export const searchNotes = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
    searchTerm: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("activity_notes")
      .withIndex("by_customer_created", q =>
        q.eq("customerId", args.customerId)
      )
      .collect();

    // Filter by orgId
    notes = notes.filter(n => n.orgId === args.orgId);

    // Search in note content
    const searchLower = args.searchTerm.toLowerCase();
    notes = notes.filter(n =>
      n.note.toLowerCase().includes(searchLower) ||
      n.authorName.toLowerCase().includes(searchLower)
    );

    // Filter by category
    if (args.category) {
      notes = notes.filter(n => n.category === args.category);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      notes = notes.filter(n =>
        args.tags!.some(tag => n.tags.includes(tag))
      );
    }

    return notes;
  },
});

/**
 * Get notes by category
 */
export const getNotesByCategory = query({
  args: {
    orgId: v.string(),
    customerId: v.id("unified_customers"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("activity_notes")
      .withIndex("by_customer_created", q =>
        q.eq("customerId", args.customerId)
      )
      .collect();

    const filtered = notes.filter(n => n.orgId === args.orgId);

    // Group by category
    const byCategory: Record<string, typeof filtered> = {
      uncategorized: [],
    };

    filtered.forEach(note => {
      const category = note.category || "uncategorized";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(note);
    });

    return byCategory;
  },
});
