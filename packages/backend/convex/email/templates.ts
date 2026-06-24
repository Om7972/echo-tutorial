/**
 * Email Support - Templates
 * Manage email templates with variables
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create email template
 */
export const createTemplate = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    variables: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      defaultValue: v.optional(v.string()),
    }))),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("email_templates", {
      orgId: args.orgId,
      name: args.name,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      category: args.category,
      tags: args.tags,
      variables: args.variables,
      usageCount: 0,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { templateId, success: true };
  },
});

/**
 * Get templates
 */
export const getTemplates = query({
  args: {
    orgId: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("email_templates")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

    let templates = await query.collect();

    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  },
});

/**
 * Get template by ID
 */
export const getTemplate = query({
  args: {
    templateId: v.id("email_templates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

/**
 * Update template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("email_templates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    bodyText: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    variables: v.optional(v.array(v.object({
      name: v.string(),
      description: v.optional(v.string()),
      defaultValue: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;

    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("email_templates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});

/**
 * Increment template usage
 */
export const incrementUsage = mutation({
  args: {
    templateId: v.id("email_templates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      usageCount: template.usageCount + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Render template with variables
 */
export const renderTemplate = query({
  args: {
    templateId: v.id("email_templates"),
    variables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    let subject = template.subject;
    let bodyHtml = template.bodyHtml;
    let bodyText = template.bodyText || "";

    // Replace variables
    if (args.variables) {
      for (const [key, value] of Object.entries(args.variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        subject = subject.replace(regex, String(value));
        bodyHtml = bodyHtml.replace(regex, String(value));
        bodyText = bodyText.replace(regex, String(value));
      }
    }

    // Replace with default values for unreplaced variables
    if (template.variables) {
      for (const variable of template.variables) {
        const regex = new RegExp(`{{${variable.name}}}`, "g");
        const defaultValue = variable.defaultValue || `[${variable.name}]`;
        subject = subject.replace(regex, defaultValue);
        bodyHtml = bodyHtml.replace(regex, defaultValue);
        bodyText = bodyText.replace(regex, defaultValue);
      }
    }

    return {
      subject,
      bodyHtml,
      bodyText,
    };
  },
});
