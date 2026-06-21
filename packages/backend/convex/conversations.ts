import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Query: List Conversations with Filters ──────────────────────────────────
export const listConversations = query({
  args: {
    orgId: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("waiting"))),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("conversations")
      .withIndex("by_org_id", (dbQ) => dbQ.eq("orgId", args.orgId));

    const conversations = await q.collect();

    // Perform filter match on status and archive state
    return conversations
      .filter((c) => {
        if (args.status !== undefined && c.status !== args.status) return false;
        if (args.isArchived !== undefined && c.isArchived !== args.isArchived) return false;
        return true;
      })
      .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  },
});

// ─── Query: Get Conversation Messages & Search ───────────────────────────────
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Sort by timestamp
    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);

    // Apply text search filter if supplied
    if (args.searchQuery) {
      const term = args.searchQuery.toLowerCase();
      return sorted.filter((m) => m.content.toLowerCase().includes(term));
    }

    return sorted;
  },
});

// ─── Query: Cursor-based Pagination for Messages ──────────────────────────────
export const getMessagesPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.number(),
    cursor: v.optional(v.string()), // Base64 encoded timestamp and _id
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
    let nextCursor: string | null = null
    if (hasMore && messages.length > 0) {
      const firstMessage = messages[0]
      nextCursor = Buffer.from(JSON.stringify({
        timestamp: firstMessage.timestamp,
        _id: firstMessage._id
      })).toString("base64")
    }

    return {
      messages,
      nextCursor,
      hasMore
    };
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Insert conversation
    const conversationId = await ctx.db.insert("conversations", {
      orgId: args.orgId,
      status: "active",
      isArchived: false,
      lastMessageText: args.initialMessage,
      lastMessageTimestamp: now,
      createdAt: now,
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
    type: v.union(v.literal("text"), v.literal("image"), v.literal("voice"), v.literal("system")),
    content: v.string(),
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
  },
  handler: async (ctx, args) => {
    const patches: Record<string, any> = {};
    if (args.status !== undefined) patches.status = args.status;
    if (args.isArchived !== undefined) patches.isArchived = args.isArchived;

    await ctx.db.patch(args.conversationId, patches);
    return true;
  },
});
