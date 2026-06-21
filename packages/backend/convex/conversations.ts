import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Query: List Conversations with Filters ──────────────────────────────────
export const listConversations = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting"))),
    isArchived: v.optional(v.boolean()),
    search: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assigneeId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("conversations")
      .withIndex("by_org_id", (dbQ) => dbQ.eq("orgId", args.orgId));

    let conversations = await q.collect();

    // Perform filter match on status, archive state, priority, assignee, tags
    conversations = conversations.filter((c: any) => {
      if (args.status !== undefined && c.status !== args.status) return false;
      if (args.isArchived !== undefined && c.isArchived !== args.isArchived) return false;
      if (args.priority !== undefined && c.priority !== args.priority) return false;
      if (args.assigneeId !== undefined && c.assigneeId !== args.assigneeId) return false;
      if (args.tags && args.tags.length > 0) {
        const hasAllTags = args.tags.every(tag => c.tags?.includes(tag));
        if (!hasAllTags) return false;
      }

      // Apply search filter if provided
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        if (!c.lastMessageText.toLowerCase().includes(searchLower)) return false;
      }

      return true;
    });

    // Sort: pinned first, then by priority (high > medium > low), then by last message timestamp descending
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return conversations.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.lastMessageTimestamp - a.lastMessageTimestamp;
    });
  },
});

// ─── Query: Get Conversation Messages & Search ───────────────────────────────
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // Apply text search filter if supplied
    if (args.searchQuery) {
      const term = args.searchQuery.toLowerCase();
      return messages.filter((m) => m.content.toLowerCase().includes(term));
    }

    return messages;
  },
});

// ─── Query: Cursor-based Pagination for Messages ──────────────────────────────
export const getMessagesPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("messages")
      .withIndex("by_conversation_timestamp", (q) =>
        q.eq("conversationId", args.conversationId)
      );

    // Apply cursor if present
    if (args.cursor) {
      const { timestamp, _id } = JSON.parse(Buffer.from(args.cursor, "base64").toString());
      query = query.order("asc").filter((q) =>
        q.or(
          q.lt(q.field("timestamp"), timestamp),
          q.and(q.eq(q.field("timestamp"), timestamp), q.lt(q.field("_id"), _id))
        )
      );
    } else {
      // No cursor: get latest messages first
      query = query.order("desc");
    }

    const rawMessages = await query.take(args.limit);

    // If we took descending, reverse to get ascending order
    let messages = args.cursor ? rawMessages : rawMessages.reverse();

    // Determine if there's a next page
    const hasMore = rawMessages.length === args.limit;

    // Create next cursor (from first message in the current batch)
    let nextCursor: string | null = null;
    if (hasMore && messages.length > 0) {
      const firstMessage = messages[0];
      nextCursor = Buffer.from(JSON.stringify({
        timestamp: firstMessage.timestamp,
        _id: firstMessage._id
      })).toString("base64");
    }

    return {
      messages,
      nextCursor,
      hasMore
    };
  },
});

// ─── Query: Get Pinned Messages ─────────────────────────────────────────────
export const getPinnedMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const pinned = await ctx.db
      .query("pinned_messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Fetch the actual messages
    const messages = [];
    for (const p of pinned) {
      const m = await ctx.db.get(p.messageId);
      if (m) {
        messages.push(m);
      }
    }
    return messages;
  },
});

// ─── Query: Get Internal Notes ─────────────────────────────────────────────
export const getInternalNotes = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("internal_notes")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return notes.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// ─── Query: Get Quick Replies ─────────────────────────────────────────────
export const getQuickReplies = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quick_replies")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

// ─── Query: Get Typing Statuses ─────────────────────────────────────────────
export const getTypingStatuses = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("typing_statuses")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Filter out stale statuses (older than 5 seconds)
    const now = Date.now();
    return statuses.filter((s) => (now - s.lastUpdatedAt < 5000) && s.isTyping);
  },
});

// ─── Mutation: Create Conversation ───────────────────────────────────────────
export const createConversation = mutation({
  args: {
    orgId: v.string(),
    initialMessage: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderType: v.union(v.literal("user"), v.literal("assistant"), v.literal("visitor")),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    tags: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Insert conversation
    const conversationId = await ctx.db.insert("conversations", {
      orgId: args.orgId,
      status: "active",
      isArchived: false,
      isPinned: false,
      lastMessageText: args.initialMessage,
      lastMessageTimestamp: now,
      createdAt: now,
      priority: args.priority || "medium",
      tags: args.tags || [],
      assigneeId: args.assigneeId,
      slaDeadline: args.priority === "high" ? now + 3600000 : args.priority === "medium" ? now + 7200000 : now + 14400000, // 1h, 2h, 4h
    });

    // 2. Insert initial message
    await ctx.db.insert("messages", {
      conversationId,
      senderId: args.senderId,
      senderName: args.senderName,
      senderType: args.senderType,
      type: "text",
      content: args.initialMessage,
      status: "sent",
      timestamp: now,
    });

    // 3. Register sender as participant
    await ctx.db.insert("participants", {
      conversationId,
      userId: args.senderId,
      role: args.senderType === "visitor" ? "visitor" : "agent",
      joinedAt: now,
    });

    return conversationId;
  },
});

// ─── Mutation: Post Message ──────────────────────────────────────────────────
export const postMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    senderName: v.string(),
    senderType: v.union(v.literal("user"), v.literal("assistant"), v.literal("visitor")),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("voice"), v.literal("system"), v.literal("attachment"), v.literal("internal_note"), v.literal("quick_reply")),
    content: v.string(),
    isInternal: v.optional(v.boolean()),
    replyToId: v.optional(v.id("messages")),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string(),
      storageId: v.id("_storage"),
    }))),
    mentions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Insert message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      senderName: args.senderName,
      senderType: args.senderType,
      type: args.type,
      content: args.content,
      status: "sent",
      timestamp: now,
      isInternal: args.isInternal,
      replyToId: args.replyToId,
      attachments: args.attachments,
      mentions: args.mentions,
    });

    // 2. Update parent conversation details
    await ctx.db.patch(args.conversationId, {
      lastMessageText: args.content,
      lastMessageTimestamp: now,
    });

    return messageId;
  },
});

// ─── Mutation: Mark Conversation Messages as Read ────────────────────────────
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Mark other users' messages in this conversation as read
    for (const msg of messages) {
      if (msg.senderId !== args.userId && msg.status !== "read") {
        await ctx.db.patch(msg._id, {
          status: "read",
        });
      }
    }
  },
});

// ─── Mutation: Update Conversation Metadata/Status ───────────────────────────
export const updateConversationStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting"))),
    isArchived: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    tags: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
    slaDeadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patches: Record<string, any> = {};
    if (args.status !== undefined) patches.status = args.status;
    if (args.isArchived !== undefined) patches.isArchived = args.isArchived;
    if (args.isPinned !== undefined) patches.isPinned = args.isPinned;
    if (args.priority !== undefined) patches.priority = args.priority;
    if (args.tags !== undefined) patches.tags = args.tags;
    if (args.assigneeId !== undefined) patches.assigneeId = args.assigneeId;
    if (args.slaDeadline !== undefined) patches.slaDeadline = args.slaDeadline;

    await ctx.db.patch(args.conversationId, patches);
    return true;
  },
});

// ─── Mutation: Bulk Update Conversations ──────────────────────────────────────
export const bulkUpdateConversations = mutation({
  args: {
    conversationIds: v.array(v.id("conversations")),
    status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting"))),
    isArchived: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    tags: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patches: Record<string, any> = {};
    if (args.status !== undefined) patches.status = args.status;
    if (args.isArchived !== undefined) patches.isArchived = args.isArchived;
    if (args.isPinned !== undefined) patches.isPinned = args.isPinned;
    if (args.priority !== undefined) patches.priority = args.priority;
    if (args.tags !== undefined) patches.tags = args.tags;
    if (args.assigneeId !== undefined) patches.assigneeId = args.assigneeId;

    for (const id of args.conversationIds) {
      await ctx.db.patch(id, patches);
    }
    return true;
  },
});

// ─── Mutation: Pin Message ───────────────────────────────────────────────
export const pinMessage = mutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    pinnedById: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already pinned
    const existing = await ctx.db
      .query("pinned_messages")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .collect();
    if (existing.length > 0) {
      return existing[0]._id;
    }

    return await ctx.db.insert("pinned_messages", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      pinnedById: args.pinnedById,
      pinnedAt: Date.now(),
    });
  },
});

// ─── Mutation: Unpin Message ─────────────────────────────────────────────
export const unpinMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pinned_messages")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const p of existing) {
      await ctx.db.delete(p._id);
    }
    return true;
  },
});

// ─── Mutation: Add Reaction ───────────────────────────────────────────────
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already reacted with this emoji
    const existing = await ctx.db
      .query("message_reactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .collect();
    if (existing.length > 0) {
      return existing[0]._id;
    }

    return await ctx.db.insert("message_reactions", {
      messageId: args.messageId,
      conversationId: args.conversationId,
      userId: args.userId,
      emoji: args.emoji,
      timestamp: Date.now(),
    });
  },
});

// ─── Mutation: Remove Reaction ─────────────────────────────────────────────
export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("message_reactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .collect();
    for (const r of existing) {
      await ctx.db.delete(r._id);
    }
    return true;
  },
});

// ─── Mutation: Add Internal Note ───────────────────────────────────────────
export const addInternalNote = mutation({
  args: {
    conversationId: v.id("conversations"),
    note: v.string(),
    authorId: v.string(),
    authorName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("internal_notes", {
      conversationId: args.conversationId,
      note: args.note,
      authorId: args.authorId,
      authorName: args.authorName,
      timestamp: Date.now(),
    });
  },
});

// ─── Mutation: Update Typing Status ───────────────────────────────────────────
export const updateTypingStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    userName: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing status
    const existing = await ctx.db
      .query("typing_statuses")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    if (existing.length > 0) {
      await ctx.db.patch(existing[0]._id, {
        isTyping: args.isTyping,
        lastUpdatedAt: now,
      });
      return existing[0]._id;
    } else {
      return await ctx.db.insert("typing_statuses", {
        conversationId: args.conversationId,
        userId: args.userId,
        userName: args.userName,
        isTyping: args.isTyping,
        lastUpdatedAt: now,
      });
    }
  },
});

// ─── Mutation: Create Quick Reply ───────────────────────────────────────────
export const createQuickReply = mutation({
  args: {
    orgId: v.string(),
    text: v.string(),
    shortcut: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quick_replies", args);
  },
});
