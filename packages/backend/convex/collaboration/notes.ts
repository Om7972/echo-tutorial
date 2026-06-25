// @ts-nocheck
/**
 * Internal Collaboration - Notes Management
 * Handles private notes, mentions, rich text, and permissions
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Create a new collaboration note
 */
export const createNote = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    content: v.string(),
    contentFormat: v.union(v.literal("markdown"), v.literal("html"), v.literal("plain")),
    plainText: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    visibility: v.union(
      v.literal("private"),
      v.literal("team"),
      v.literal("mentioned"),
      v.literal("assigned")
    ),
    isPinned: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const noteId = await ctx.db.insert("collaboration_notes", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      customerId: args.customerId,
      content: args.content,
      contentFormat: args.contentFormat,
      plainText: args.plainText,
      authorId: args.authorId,
      authorName: args.authorName,
      visibility: args.visibility,
      isPinned: args.isPinned || false,
      tags: args.tags || [],
      category: args.category,
      mentions: args.mentions || [],
      createdAt: now,
      updatedAt: now,
    });

    // Create mentions
    if (args.mentions && args.mentions.length > 0) {
      await ctx.scheduler.runAfter(0, internal.collaboration.notifications.createMentionNotifications, {
        noteId,
        mentions: args.mentions,
        mentionedBy: args.authorId,
        orgId: args.orgId,
        conversationId: args.conversationId,
        content: args.plainText,
      });
    }

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      activityType: "note_created",
      actorId: args.authorId,
      actorName: args.authorName,
      targetType: "note",
      targetId: noteId,
      description: `Created a ${args.visibility} note`,
    });

    // Update tag usage
    if (args.tags && args.tags.length > 0) {
      for (const tag of args.tags) {
        await ctx.scheduler.runAfter(0, internal.collaboration.tags.incrementTagUsage, {
          orgId: args.orgId,
          tagName: tag,
        });
      }
    }

    return { noteId, success: true };
  },
});

/**
 * Get notes with filters
 */
export const getNotes = query({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
    customerId: v.optional(v.id("unified_customers")),
    authorId: v.optional(v.string()),
    userId: v.string(), // Current user for permission check
    visibility: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("collaboration_notes")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .filter(q => q.eq(q.field("deletedAt"), undefined));

    let notes = await query.collect();

    // Filter by conversation
    if (args.conversationId) {
      notes = notes.filter(n => n.conversationId === args.conversationId);
    }

    // Filter by customer
    if (args.customerId) {
      notes = notes.filter(n => n.customerId === args.customerId);
    }

    // Filter by author
    if (args.authorId) {
      notes = notes.filter(n => n.authorId === args.authorId);
    }

    // Filter by visibility (permission check)
    notes = notes.filter(n => {
      // Author can always see their own notes
      if (n.authorId === args.userId) return true;
      
      // Private notes only visible to author
      if (n.visibility === "private") return false;
      
      // Team notes visible to all
      if (n.visibility === "team") return true;
      
      // Mentioned notes visible to mentioned users
      if (n.visibility === "mentioned") {
        return n.mentions.includes(args.userId);
      }
      
      // TODO: Check assignment visibility
      return false;
    });

    // Filter by visibility types
    if (args.visibility && args.visibility.length > 0) {
      notes = notes.filter(n => args.visibility!.includes(n.visibility));
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      notes = notes.filter(n =>
        args.tags!.some(tag => n.tags.includes(tag))
      );
    }

    // Filter by pinned
    if (args.isPinned !== undefined) {
      notes = notes.filter(n => n.isPinned === args.isPinned);
    }

    // Sort by pinned first, then by created date
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });

    // Apply limit
    const limit = args.limit || 50;
    return notes.slice(0, limit);
  },
});

/**
 * Update a note
 */
export const updateNote = mutation({
  args: {
    noteId: v.id("collaboration_notes"),
    orgId: v.string(),
    userId: v.string(),
    content: v.optional(v.string()),
    contentFormat: v.optional(v.union(v.literal("markdown"), v.literal("html"), v.literal("plain"))),
    plainText: v.optional(v.string()),
    visibility: v.optional(v.union(
      v.literal("private"),
      v.literal("team"),
      v.literal("mentioned"),
      v.literal("assigned")
    )),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    // Permission check: only author can edit
    if (note.authorId !== args.userId) {
      throw new Error("Only the author can edit this note");
    }

    const now = Date.now();
    const updates: any = { updatedAt: now };

    // Track edit history
    if (args.content && args.content !== note.content) {
      const editHistory = note.editHistory || [];
      editHistory.push({
        editedAt: now,
        editedBy: args.userId,
        previousContent: note.content,
      });
      updates.editHistory = editHistory;
      updates.content = args.content;
    }

    if (args.contentFormat) updates.contentFormat = args.contentFormat;
    if (args.plainText) updates.plainText = args.plainText;
    if (args.visibility) updates.visibility = args.visibility;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.category !== undefined) updates.category = args.category;

    // Handle new mentions
    if (args.mentions !== undefined) {
      const newMentions = args.mentions.filter(m => !note.mentions.includes(m));
      if (newMentions.length > 0) {
        await ctx.scheduler.runAfter(0, internal.collaboration.notifications.createMentionNotifications, {
          noteId: args.noteId,
          mentions: newMentions,
          mentionedBy: args.userId,
          orgId: args.orgId,
          conversationId: note.conversationId,
          content: args.plainText || note.plainText,
        });
      }
      updates.mentions = args.mentions;
    }

    await ctx.db.patch(args.noteId, updates);

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: args.orgId,
      conversationId: note.conversationId,
      activityType: "note_updated",
      actorId: args.userId,
      actorName: note.authorName,
      targetType: "note",
      targetId: args.noteId,
      description: "Updated note",
    });

    return { success: true };
  },
});

/**
 * Delete a note (soft delete)
 */
export const deleteNote = mutation({
  args: {
    noteId: v.id("collaboration_notes"),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    // Permission check
    if (note.authorId !== args.userId) {
      throw new Error("Only the author can delete this note");
    }

    await ctx.db.patch(args.noteId, {
      deletedAt: Date.now(),
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: args.orgId,
      conversationId: note.conversationId,
      activityType: "note_deleted",
      actorId: args.userId,
      actorName: note.authorName,
      targetType: "note",
      targetId: args.noteId,
      description: "Deleted note",
    });

    return { success: true };
  },
});

/**
 * Pin/unpin a note
 */
export const togglePin = mutation({
  args: {
    noteId: v.id("collaboration_notes"),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.orgId !== args.orgId) {
      throw new Error("Note not found or access denied");
    }

    const newPinState = !note.isPinned;

    await ctx.db.patch(args.noteId, {
      isPinned: newPinState,
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: args.orgId,
      conversationId: note.conversationId,
      activityType: newPinState ? "note_pinned" : "note_unpinned",
      actorId: args.userId,
      actorName: note.authorName,
      targetType: "note",
      targetId: args.noteId,
      description: newPinState ? "Pinned note" : "Unpinned note",
    });

    return { isPinned: newPinState, success: true };
  },
});

/**
 * Search notes
 */
export const searchNotes = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.searchTerm.length < 2) {
      return [];
    }

    const results = await ctx.db
      .query("collaboration_notes")
      .withSearchIndex("search_content", q =>
        q.search("plainText", args.searchTerm).eq("orgId", args.orgId)
      )
      .collect();

    // Filter by permissions
    const filtered = results.filter(note => {
      if (note.deletedAt) return false;
      if (note.authorId === args.userId) return true;
      if (note.visibility === "private") return false;
      if (note.visibility === "team") return true;
      if (note.visibility === "mentioned") {
        return note.mentions.includes(args.userId);
      }
      return false;
    });

    const limit = args.limit || 20;
    return filtered.slice(0, limit);
  },
});

/**
 * Get pinned notes
 */
export const getPinnedNotes = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    conversationId: v.optional(v.id("unified_conversations")),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("collaboration_notes")
      .withIndex("by_org_pinned", q =>
        q.eq("orgId", args.orgId).eq("isPinned", true)
      )
      .filter(q => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Filter by conversation if provided
    if (args.conversationId) {
      notes = notes.filter(n => n.conversationId === args.conversationId);
    }

    // Filter by permissions
    notes = notes.filter(note => {
      if (note.authorId === args.userId) return true;
      if (note.visibility === "private") return false;
      if (note.visibility === "team") return true;
      if (note.visibility === "mentioned") {
        return note.mentions.includes(args.userId);
      }
      return false;
    });

    return notes;
  },
});

/**
 * Get note by ID
 */
export const getNote = query({
  args: {
    noteId: v.id("collaboration_notes"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    
    if (!note || note.deletedAt) {
      return null;
    }

    // Permission check
    if (note.authorId === args.userId) return note;
    if (note.visibility === "private") return null;
    if (note.visibility === "team") return note;
    if (note.visibility === "mentioned" && note.mentions.includes(args.userId)) {
      return note;
    }

    return null;
  },
});
