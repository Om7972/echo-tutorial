// @ts-nocheck
/**
 * Internal Collaboration - Permission Control
 * Handles fine-grained access control for resources
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Grant permission
 */
export const grantPermission = mutation({
  args: {
    orgId: v.string(),
    userId: v.optional(v.string()),
    roleId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    resourceType: v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    ),
    resourceId: v.string(),
    permission: v.union(
      v.literal("view"),
      v.literal("comment"),
      v.literal("edit"),
      v.literal("delete"),
      v.literal("admin")
    ),
    grantedBy: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if permission already exists
    const existing = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_resource", q =>
        q.eq("orgId", args.orgId)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId)
      )
      .filter(q =>
        args.userId
          ? q.eq(q.field("userId"), args.userId)
          : q.eq(q.field("userId"), undefined)
      )
      .first();

    if (existing) {
      // Update existing permission
      await ctx.db.patch(existing._id, {
        permission: args.permission,
        expiresAt: args.expiresAt,
        grantedAt: Date.now(),
        grantedBy: args.grantedBy,
      });
      return { permissionId: existing._id, updated: true };
    }

    const now = Date.now();
    const permissionId = await ctx.db.insert("collaboration_permissions", {
      orgId: args.orgId,
      userId: args.userId,
      roleId: args.roleId,
      teamId: args.teamId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      permission: args.permission,
      grantedBy: args.grantedBy,
      grantedAt: now,
      expiresAt: args.expiresAt,
      createdAt: now,
    });

    return { permissionId, updated: false };
  },
});

/**
 * Check permission
 */
export const checkPermission = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    resourceType: v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    ),
    resourceId: v.string(),
    requiredPermission: v.union(
      v.literal("view"),
      v.literal("comment"),
      v.literal("edit"),
      v.literal("delete"),
      v.literal("admin")
    ),
  },
  handler: async (ctx, args) => {
    const permissions = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_resource", q =>
        q.eq("orgId", args.orgId)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId)
      )
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();

    const now = Date.now();
    
    // Check if user has required permission
    const permissionLevels = ["view", "comment", "edit", "delete", "admin"];
    const requiredLevel = permissionLevels.indexOf(args.requiredPermission);

    for (const perm of permissions) {
      // Check expiration
      if (perm.expiresAt && perm.expiresAt < now) {
        continue;
      }

      const userLevel = permissionLevels.indexOf(perm.permission);
      if (userLevel >= requiredLevel) {
        return { hasPermission: true, permission: perm.permission };
      }
    }

    return { hasPermission: false };
  },
});

/**
 * Get user permissions
 */
export const getUserPermissions = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    resourceType: v.optional(v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    )),
  },
  handler: async (ctx, args) => {
    let permissions = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_user", q =>
        q.eq("orgId", args.orgId).eq("userId", args.userId)
      )
      .collect();

    if (args.resourceType) {
      permissions = permissions.filter(p => p.resourceType === args.resourceType);
    }

    // Filter out expired
    const now = Date.now();
    permissions = permissions.filter(p => !p.expiresAt || p.expiresAt > now);

    return permissions;
  },
});

/**
 * Get resource permissions
 */
export const getResourcePermissions = query({
  args: {
    orgId: v.string(),
    resourceType: v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    ),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const permissions = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_resource", q =>
        q.eq("orgId", args.orgId)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId)
      )
      .collect();

    // Filter out expired
    const now = Date.now();
    return permissions.filter(p => !p.expiresAt || p.expiresAt > now);
  },
});

/**
 * Revoke permission
 */
export const revokePermission = mutation({
  args: {
    permissionId: v.id("collaboration_permissions"),
    orgId: v.string(),
    revokedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const permission = await ctx.db.get(args.permissionId);
    
    if (!permission || permission.orgId !== args.orgId) {
      throw new Error("Permission not found or access denied");
    }

    await ctx.db.delete(args.permissionId);

    return { success: true };
  },
});

/**
 * Revoke user permissions for resource
 */
export const revokeUserPermissions = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    resourceType: v.union(
      v.literal("note"),
      v.literal("conversation"),
      v.literal("customer"),
      v.literal("team")
    ),
    resourceId: v.string(),
    revokedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const permissions = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_resource", q =>
        q.eq("orgId", args.orgId)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId)
      )
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();

    for (const permission of permissions) {
      await ctx.db.delete(permission._id);
    }

    return { count: permissions.length, success: true };
  },
});

/**
 * Clean expired permissions
 */
export const cleanExpiredPermissions = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const permissions = await ctx.db
      .query("collaboration_permissions")
      .withIndex("by_org_id", q => q.eq("orgId", args.orgId))
      .collect();

    const expired = permissions.filter(p => p.expiresAt && p.expiresAt < now);

    for (const permission of expired) {
      await ctx.db.delete(permission._id);
    }

    return { count: expired.length, success: true };
  },
});
