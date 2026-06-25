// @ts-nocheck
/**
 * Notification Templates Management
 * Handle email templates for various notification types
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all templates
 */
export const getTemplates = query({
  args: {
    orgId: v.optional(v.string()),
    templateType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("notification_templates");

    if (args.orgId) {
      query = ctx.db
        .query("notification_templates")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
    }

    let templates = await query.collect();

    if (args.templateType) {
      templates = templates.filter((t) => t.templateType === args.templateType);
    }

    return templates.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single template
 */
export const getTemplate = query({
  args: {
    templateId: v.id("notification_templates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

/**
 * Get default template for a type
 */
export const getDefaultTemplate = query({
  args: {
    orgId: v.optional(v.string()),
    templateType: v.string(),
  },
  handler: async (ctx, args) => {
    // First try org-specific default
    if (args.orgId) {
      const orgTemplate = await ctx.db
        .query("notification_templates")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", args.orgId).eq("templateType", args.templateType as any)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();

      if (orgTemplate) return orgTemplate;
    }

    // Fall back to system default (orgId = null)
    const systemTemplate = await ctx.db
      .query("notification_templates")
      .withIndex("by_org_type", (q) =>
        q.eq("orgId", null).eq("templateType", args.templateType as any)
      )
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    return systemTemplate;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a template
 */
export const createTemplate = mutation({
  args: {
    orgId: v.optional(v.string()),
    name: v.string(),
    templateType: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
    variables: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
      })
    ),
    isActive: v.boolean(),
    isDefault: v.boolean(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("notification_templates")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", args.orgId || null).eq("templateType", args.templateType as any)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const template of existingDefaults) {
        await ctx.db.patch(template._id, { isDefault: false });
      }
    }

    return await ctx.db.insert("notification_templates", {
      orgId: args.orgId,
      name: args.name,
      templateType: args.templateType as any,
      subject: args.subject,
      htmlBody: args.htmlBody,
      textBody: args.textBody,
      variables: args.variables,
      isActive: args.isActive,
      isDefault: args.isDefault,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("notification_templates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    htmlBody: v.optional(v.string()),
    textBody: v.optional(v.string()),
    variables: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          defaultValue: v.optional(v.string()),
          required: v.boolean(),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;
    const template = await ctx.db.get(templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      const existingDefaults = await ctx.db
        .query("notification_templates")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", template.orgId || null).eq("templateType", template.templateType)
        )
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const t of existingDefaults) {
        if (t._id !== templateId) {
          await ctx.db.patch(t._id, { isDefault: false });
        }
      }
    }

    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("notification_templates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});

/**
 * Render template with variables
 */
export const renderTemplate = query({
  args: {
    templateId: v.id("notification_templates"),
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let htmlBody = template.htmlBody;
    let textBody = template.textBody || "";

    for (const [key, value] of Object.entries(args.variables || {})) {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value);

      subject = subject.replace(new RegExp(placeholder, "g"), valueStr);
      htmlBody = htmlBody.replace(new RegExp(placeholder, "g"), valueStr);
      textBody = textBody.replace(new RegExp(placeholder, "g"), valueStr);
    }

    return {
      subject,
      htmlBody,
      textBody,
    };
  },
});

// ─── Default Templates ──────────────────────────────────────────────────────

/**
 * Initialize default system templates
 */
export const initializeDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const defaultTemplates = [
      {
        name: "New Message Notification",
        templateType: "new_message" as const,
        subject: "New message from {{customerName}}",
        htmlBody: `
          <h2>New Message</h2>
          <p>You have a new message from <strong>{{customerName}}</strong></p>
          <p>{{messageContent}}</p>
          <p><a href="{{conversationUrl}}">View Conversation</a></p>
        `,
        textBody: "New message from {{customerName}}: {{messageContent}}",
        variables: [
          { name: "customerName", description: "Customer name", required: true },
          { name: "messageContent", description: "Message content", required: true },
          { name: "conversationUrl", description: "Conversation URL", required: true },
        ],
      },
      {
        name: "Human Handoff",
        templateType: "human_handoff" as const,
        subject: "Customer needs assistance - Conversation #{{conversationId}}",
        htmlBody: `
          <h2>Human Handoff Required</h2>
          <p>A conversation requires human assistance.</p>
          <p><strong>Customer:</strong> {{customerName}}</p>
          <p><strong>Reason:</strong> {{handoffReason}}</p>
          <p><a href="{{conversationUrl}}">View Conversation</a></p>
        `,
        textBody: "Human handoff required for {{customerName}}. Reason: {{handoffReason}}",
        variables: [
          { name: "conversationId", description: "Conversation ID", required: true },
          { name: "customerName", description: "Customer name", required: true },
          { name: "handoffReason", description: "Reason for handoff", required: true },
          { name: "conversationUrl", description: "Conversation URL", required: true },
        ],
      },
      {
        name: "Ticket Closed",
        templateType: "ticket_closed" as const,
        subject: "Your ticket has been resolved",
        htmlBody: `
          <h2>Ticket Resolved</h2>
          <p>Hi {{customerName}},</p>
          <p>Your support ticket has been resolved.</p>
          <p><strong>Resolution:</strong> {{resolutionSummary}}</p>
          <p>If you have any further questions, please don't hesitate to reach out.</p>
        `,
        textBody: "Hi {{customerName}}, your ticket has been resolved. {{resolutionSummary}}",
        variables: [
          { name: "customerName", description: "Customer name", required: true },
          { name: "resolutionSummary", description: "Resolution summary", required: true },
        ],
      },
      {
        name: "Subscription Expiring",
        templateType: "subscription_expiring" as const,
        subject: "Your subscription expires in {{daysRemaining}} days",
        htmlBody: `
          <h2>Subscription Expiring Soon</h2>
          <p>Hi {{customerName}},</p>
          <p>Your {{planName}} subscription will expire in <strong>{{daysRemaining}} days</strong>.</p>
          <p>To continue enjoying our services, please renew your subscription.</p>
          <p><a href="{{renewalUrl}}">Renew Now</a></p>
        `,
        textBody: "Hi {{customerName}}, your subscription expires in {{daysRemaining}} days. Renew at {{renewalUrl}}",
        variables: [
          { name: "customerName", description: "Customer name", required: true },
          { name: "planName", description: "Plan name", required: true },
          { name: "daysRemaining", description: "Days remaining", required: true },
          { name: "renewalUrl", description: "Renewal URL", required: true },
        ],
      },
      {
        name: "Team Invitation",
        templateType: "invitation_email" as const,
        subject: "You've been invited to join {{orgName}}",
        htmlBody: `
          <h2>Team Invitation</h2>
          <p>Hi {{recipientName}},</p>
          <p>{{inviterName}} has invited you to join <strong>{{orgName}}</strong>.</p>
          <p><a href="{{invitationUrl}}">Accept Invitation</a></p>
        `,
        textBody: "{{inviterName}} invited you to join {{orgName}}. Accept at {{invitationUrl}}",
        variables: [
          { name: "recipientName", description: "Recipient name", required: true },
          { name: "inviterName", description: "Inviter name", required: true },
          { name: "orgName", description: "Organization name", required: true },
          { name: "invitationUrl", description: "Invitation URL", required: true },
        ],
      },
      {
        name: "Password Reset",
        templateType: "password_reset" as const,
        subject: "Reset your password",
        htmlBody: `
          <h2>Password Reset</h2>
          <p>Hi {{userName}},</p>
          <p>We received a request to reset your password.</p>
          <p><a href="{{resetUrl}}">Reset Password</a></p>
          <p>This link expires in {{expiryMinutes}} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
        textBody: "Reset your password at {{resetUrl}}. Link expires in {{expiryMinutes}} minutes.",
        variables: [
          { name: "userName", description: "User name", required: true },
          { name: "resetUrl", description: "Reset URL", required: true },
          { name: "expiryMinutes", description: "Expiry time in minutes", required: true },
        ],
      },
      {
        name: "Daily Digest",
        templateType: "digest_email" as const,
        subject: "Your daily summary - {{date}}",
        htmlBody: `
          <h2>Daily Summary</h2>
          <p>Hi {{userName}},</p>
          <p>Here's your activity summary for {{date}}:</p>
          <ul>
            <li><strong>New Conversations:</strong> {{newConversations}}</li>
            <li><strong>Resolved:</strong> {{resolvedConversations}}</li>
            <li><strong>Pending:</strong> {{pendingConversations}}</li>
            <li><strong>CSAT Score:</strong> {{csatScore}}%</li>
          </ul>
          <p><a href="{{dashboardUrl}}">View Dashboard</a></p>
        `,
        textBody: "Daily summary: {{newConversations}} new, {{resolvedConversations}} resolved, {{pendingConversations}} pending.",
        variables: [
          { name: "userName", description: "User name", required: true },
          { name: "date", description: "Date", required: true },
          { name: "newConversations", description: "New conversations count", required: true },
          { name: "resolvedConversations", description: "Resolved count", required: true },
          { name: "pendingConversations", description: "Pending count", required: true },
          { name: "csatScore", description: "CSAT score", required: true },
          { name: "dashboardUrl", description: "Dashboard URL", required: true },
        ],
      },
    ];

    for (const template of defaultTemplates) {
      // Check if template already exists
      const existing = await ctx.db
        .query("notification_templates")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", null).eq("templateType", template.templateType)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("notification_templates", {
          orgId: null,
          ...template,
          isActive: true,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, count: defaultTemplates.length };
  },
});
