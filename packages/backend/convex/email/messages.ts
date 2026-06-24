/**
 * Email Support - Message Management
 * Handle inbound/outbound emails, threading, attachments
 */

import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Send email
 */
export const sendEmail: any = action({
  args: {
    orgId: v.string(),
    emailAccountId: v.id("email_accounts"),
    to: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    cc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    bcc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    conversationId: v.optional(v.id("unified_conversations")),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    // Get email account
    const account = await ctx.runQuery(internal.email.messages.getAccount, {
      accountId: args.emailAccountId,
    });

    if (!account) {
      throw new Error("Email account not found");
    }

    // Generate message ID
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${account.email.split("@")[1]}>`;

    // Generate tracking pixel ID if enabled
    const trackingPixelId = account.enableTrackingPixels
      ? `${messageId}-${Date.now()}`
      : undefined;

    // Insert tracking pixel into HTML if enabled
    let finalBodyHtml = args.bodyHtml;
    if (trackingPixelId) {
      const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/open/${trackingPixelId}`;
      finalBodyHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
    }

    // Add signature if configured
    if (account.signature) {
      finalBodyHtml += `<br/><br/>${account.signature}`;
    }

    // Store message in database first
    const emailMessageId = await ctx.runMutation(internal.email.messages.createMessage, {
      orgId: args.orgId,
      emailAccountId: args.emailAccountId,
      conversationId: args.conversationId,
      messageId,
      threadId: args.inReplyTo ? await ctx.runQuery(internal.email.messages.findThreadId, {
        messageId: args.inReplyTo,
      }) : undefined,
      inReplyTo: args.inReplyTo,
      references: args.references,
      from: {
        email: account.email,
        name: account.displayName,
      },
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyText: args.bodyText,
      bodyHtml: finalBodyHtml,
      attachments: args.attachments,
      direction: "outbound",
      status: "sending",
      trackingPixelId,
    });

    try {
      // TODO: Implement actual SMTP sending via Resend or similar service
      // For now, we'll use Resend API as an example
      
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${account.displayName} <${account.email}>`,
          to: args.to.map((r) => r.email),
          cc: args.cc?.map((r) => r.email),
          bcc: args.bcc?.map((r) => r.email),
          subject: args.subject,
          html: finalBodyHtml,
          text: args.bodyText,
          headers: {
            "Message-ID": messageId,
            "In-Reply-To": args.inReplyTo,
            References: args.references?.join(" "),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      const result = await response.json();

      // Update message status
      await ctx.runMutation(internal.email.messages.updateMessageStatus, {
        messageId: emailMessageId,
        status: "sent",
        sentAt: Date.now(),
      });

      // Log delivery
      await ctx.runMutation(internal.email.messages.logDelivery, {
        orgId: args.orgId,
        emailMessageId,
        event: "sent",
        recipientEmail: args.to[0].email,
      });

      return { success: true, messageId: emailMessageId, externalId: result.id };
    } catch (error: any) {
      // Update message status to failed
      await ctx.runMutation(internal.email.messages.updateMessageStatus, {
        messageId: emailMessageId,
        status: "failed",
        errorMessage: error.message,
      });

      // Log delivery failure
      await ctx.runMutation(internal.email.messages.logDelivery, {
        orgId: args.orgId,
        emailMessageId,
        event: "failed",
        recipientEmail: args.to[0].email,
        errorMessage: error.message,
      });

      throw error;
    }
  },
});

/**
 * Receive inbound email (webhook handler)
 */
export const receiveEmail = mutation({
  args: {
    orgId: v.string(),
    emailAccountId: v.id("email_accounts"),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    to: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    cc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    attachments: v.optional(v.array(v.any())),
    headers: v.optional(v.any()),
    spamScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check spam score
    const isSpam = (args.spamScore && args.spamScore > 5) || false;

    const emailMessageId = await ctx.db.insert("email_messages", {
      orgId: args.orgId,
      emailAccountId: args.emailAccountId,
      messageId: args.messageId,
      threadId: args.threadId,
      inReplyTo: args.inReplyTo,
      references: args.references,
      from: args.from,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      bodyText: args.bodyText,
      bodyHtml: args.bodyHtml,
      attachments: args.attachments,
      direction: "inbound",
      status: isSpam ? "spam" : "received",
      isRead: false,
      isStarred: false,
      isSpam,
      spamScore: args.spamScore,
      headers: args.headers,
      receivedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create or update thread
    if (args.threadId) {
      await ctx.scheduler.runAfter(0, internal.email.threads.updateThread, {
        threadId: args.threadId,
        orgId: args.orgId,
        subject: args.subject,
        participants: [args.from, ...args.to],
      });
    } else {
      // Create new thread
      await ctx.scheduler.runAfter(0, internal.email.threads.createThread, {
        orgId: args.orgId,
        threadId: args.messageId,
        subject: args.subject,
        participants: [args.from, ...args.to],
      });
    }

    // Create or link to conversation
    if (!isSpam) {
      await ctx.scheduler.runAfter(0, internal.email.messages.linkToConversation, {
        emailMessageId,
        orgId: args.orgId,
        from: args.from,
        subject: args.subject,
        threadId: args.threadId || args.messageId,
      });
    }

    return { emailMessageId, success: true };
  },
});

/**
 * Get emails for conversation
 */
export const getConversationEmails = query({
  args: {
    conversationId: v.id("unified_conversations"),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("email_messages")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return emails;
  },
});

/**
 * Get email thread
 */
export const getThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("email_messages")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return emails;
  },
});

/**
 * Mark email as read
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("email_messages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isRead: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Star/unstar email
 */
export const toggleStar = mutation({
  args: {
    messageId: v.id("email_messages"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.messageId);
    if (!email) {
      throw new Error("Email not found");
    }

    await ctx.db.patch(args.messageId, {
      isStarred: !email.isStarred,
      updatedAt: Date.now(),
    });

    return { isStarred: !email.isStarred, success: true };
  },
});

// ─── Internal Functions ────────────────────────────────────────────────────

export const getAccount = query({
  args: {
    accountId: v.id("email_accounts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

export const findThreadId = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db
      .query("email_messages")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .first();

    return email?.threadId;
  },
});

export const createMessage = mutation({
  args: {
    orgId: v.string(),
    emailAccountId: v.id("email_accounts"),
    conversationId: v.optional(v.id("unified_conversations")),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    to: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    cc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    bcc: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }))),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.string(),
    attachments: v.optional(v.array(v.any())),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.string(),
    trackingPixelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const emailMessageId = await ctx.db.insert("email_messages", {
      ...args,
      isRead: args.direction === "outbound",
      isStarred: false,
      isSpam: false,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    } as any);

    return emailMessageId;
  },
});

export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("email_messages"),
    status: v.string(),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...updates } = args;

    await ctx.db.patch(messageId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);
  },
});

export const logDelivery = mutation({
  args: {
    orgId: v.string(),
    emailMessageId: v.id("email_messages"),
    event: v.string(),
    recipientEmail: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_delivery_logs", {
      orgId: args.orgId,
      emailMessageId: args.emailMessageId,
      event: args.event as any,
      recipientEmail: args.recipientEmail,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      errorMessage: args.errorMessage,
      timestamp: Date.now(),
    });
  },
});

export const linkToConversation = mutation({
  args: {
    emailMessageId: v.id("email_messages"),
    orgId: v.string(),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    subject: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing conversation by thread ID or create new one
    const existingThread = await ctx.db
      .query("email_threads")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .first();

    let conversationId = existingThread?.conversationId;

    if (!conversationId) {
      // Create new conversation in unified inbox
      conversationId = await ctx.db.insert("unified_conversations", {
        orgId: args.orgId,
        channelId: args.emailMessageId as any,
        channelType: "email",
        customerId: undefined as any, // TODO: Find or create customer
        status: "active",
        priority: "medium",
        tags: [],
        metadata: {
          threadId: args.threadId,
          subject: args.subject,
        },
        unreadCount: 1,
        lastMessageAt: Date.now(),
        lastMessagePreview: args.subject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Link email to conversation
    await ctx.db.patch(args.emailMessageId, {
      conversationId,
    });

    return conversationId;
  },
});
