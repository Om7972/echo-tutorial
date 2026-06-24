/**
 * Email Support - Account Management
 * IMAP/SMTP configuration and management
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Create email account
 */
export const createAccount = mutation({
  args: {
    orgId: v.string(),
    email: v.string(),
    displayName: v.string(),
    provider: v.union(
      v.literal("gmail"),
      v.literal("outlook"),
      v.literal("imap"),
      v.literal("custom")
    ),
    imapHost: v.optional(v.string()),
    imapPort: v.optional(v.number()),
    imapUsername: v.optional(v.string()),
    imapPassword: v.optional(v.string()),
    imapUseSsl: v.optional(v.boolean()),
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpUsername: v.optional(v.string()),
    smtpPassword: v.optional(v.string()),
    smtpUseSsl: v.optional(v.boolean()),
    signature: v.optional(v.string()),
    autoCloseAfterDays: v.optional(v.number()),
    enableSpamFilter: v.optional(v.boolean()),
    enableTrackingPixels: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const accountId = await ctx.db.insert("email_accounts", {
      orgId: args.orgId,
      email: args.email,
      displayName: args.displayName,
      provider: args.provider,
      imapHost: args.imapHost,
      imapPort: args.imapPort,
      imapUsername: args.imapUsername,
      imapPassword: args.imapPassword, // TODO: Encrypt this
      imapUseSsl: args.imapUseSsl ?? true,
      smtpHost: args.smtpHost,
      smtpPort: args.smtpPort,
      smtpUsername: args.smtpUsername,
      smtpPassword: args.smtpPassword, // TODO: Encrypt this
      smtpUseSsl: args.smtpUseSsl ?? true,
      signature: args.signature,
      autoCloseAfterDays: args.autoCloseAfterDays,
      enableSpamFilter: args.enableSpamFilter ?? true,
      enableTrackingPixels: args.enableTrackingPixels ?? true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return { accountId, success: true };
  },
});

/**
 * Get email accounts
 */
export const getAccounts = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("email_accounts")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Don't return passwords
    return accounts.map((account) => ({
      ...account,
      imapPassword: undefined,
      smtpPassword: undefined,
    }));
  },
});

/**
 * Update email account
 */
export const updateAccount = mutation({
  args: {
    accountId: v.id("email_accounts"),
    displayName: v.optional(v.string()),
    signature: v.optional(v.string()),
    autoCloseAfterDays: v.optional(v.number()),
    enableSpamFilter: v.optional(v.boolean()),
    enableTrackingPixels: v.optional(v.boolean()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("disabled"),
      v.literal("error")
    )),
  },
  handler: async (ctx, args) => {
    const { accountId, ...updates } = args;

    await ctx.db.patch(accountId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete email account
 */
export const deleteAccount = mutation({
  args: {
    accountId: v.id("email_accounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
    return { success: true };
  },
});

/**
 * Update last sync time
 */
export const updateLastSync = mutation({
  args: {
    accountId: v.id("email_accounts"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (args.error) {
      updates.status = "error";
      updates.lastError = args.error;
    } else {
      updates.status = "active";
      updates.lastError = undefined;
    }

    await ctx.db.patch(args.accountId, updates);

    return { success: true };
  },
});
