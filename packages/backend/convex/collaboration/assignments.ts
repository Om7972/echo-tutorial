/**
 * Internal Collaboration - Assignment Management
 * Handles task assignments, ownership, and collaboration
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Create an assignment
 */
export const createAssignment = mutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("unified_conversations"),
    assignedTo: v.string(),
    assignedBy: v.string(),
    assignmentType: v.union(
      v.literal("owner"),
      v.literal("collaborator"),
      v.literal("watcher"),
      v.literal("reviewer")
    ),
    note: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const assignmentId = await ctx.db.insert("collaboration_assignments", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      assignedTo: args.assignedTo,
      assignedBy: args.assignedBy,
      assignmentType: args.assignmentType,
      status: "pending",
      note: args.note,
      dueDate: args.dueDate,
      priority: args.priority || "medium",
      createdAt: now,
      updatedAt: now,
    });

    // Create notification
    await ctx.scheduler.runAfter(0, internal.collaboration.notifications.createAssignmentNotification, {
      assignmentId,
      orgId: args.orgId,
      userId: args.assignedTo,
      conversationId: args.conversationId,
      assignedBy: args.assignedBy,
      assignmentType: args.assignmentType,
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      activityType: "assignment_created",
      actorId: args.assignedBy,
      actorName: "System", // Would get actual name
      targetType: "assignment",
      targetId: assignmentId,
      description: `Assigned to user as ${args.assignmentType}`,
    });

    return { assignmentId, success: true };
  },
});

/**
 * Get assignments for a user
 */
export const getUserAssignments = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    status: v.optional(v.array(v.string())),
    assignmentType: v.optional(v.array(v.string())),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let assignments = await ctx.db
      .query("collaboration_assignments")
      .withIndex("by_org_assigned_to", q =>
        q.eq("orgId", args.orgId).eq("assignedTo", args.userId)
      )
      .collect();

    // Filter by status
    if (args.status && args.status.length > 0) {
      assignments = assignments.filter(a => args.status!.includes(a.status));
    } else if (!args.includeCompleted) {
      assignments = assignments.filter(a => a.status !== "completed");
    }

    // Filter by type
    if (args.assignmentType && args.assignmentType.length > 0) {
      assignments = assignments.filter(a => args.assignmentType!.includes(a.assignmentType));
    }

    // Sort by priority and due date
    assignments.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      
      return b.createdAt - a.createdAt;
    });

    // Enrich with conversation data
    const enriched = await Promise.all(
      assignments.map(async (assignment) => {
        const conversation = await ctx.db.get(assignment.conversationId);
        return {
          ...assignment,
          conversation: conversation ? {
            id: conversation._id,
            status: conversation.status,
            channelType: conversation.channelType,
          } : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get assignments for a conversation
 */
export const getConversationAssignments = query({
  args: {
    conversationId: v.id("unified_conversations"),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let assignments = await ctx.db
      .query("collaboration_assignments")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .collect();

    if (!args.includeCompleted) {
      assignments = assignments.filter(a => a.status !== "completed");
    }

    return assignments;
  },
});

/**
 * Accept an assignment
 */
export const acceptAssignment = mutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.assignedTo !== args.userId) {
      throw new Error("You can only accept your own assignments");
    }

    const now = Date.now();

    await ctx.db.patch(args.assignmentId, {
      status: "accepted",
      acceptedAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: assignment.orgId,
      conversationId: assignment.conversationId,
      activityType: "assignment_accepted",
      actorId: args.userId,
      actorName: "User",
      targetType: "assignment",
      targetId: args.assignmentId,
      description: "Accepted assignment",
    });

    return { success: true };
  },
});

/**
 * Decline an assignment
 */
export const declineAssignment = mutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.assignedTo !== args.userId) {
      throw new Error("You can only decline your own assignments");
    }

    await ctx.db.patch(args.assignmentId, {
      status: "declined",
      note: args.reason,
      updatedAt: Date.now(),
    });

    // Notify the assigner
    await ctx.scheduler.runAfter(0, internal.collaboration.notifications.createNotification, {
      orgId: assignment.orgId,
      userId: assignment.assignedBy,
      type: "status_change",
      title: "Assignment Declined",
      message: `Assignment was declined${args.reason ? `: ${args.reason}` : ""}`,
      conversationId: assignment.conversationId,
      assignmentId: args.assignmentId,
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: assignment.orgId,
      conversationId: assignment.conversationId,
      activityType: "assignment_declined",
      actorId: args.userId,
      actorName: "User",
      targetType: "assignment",
      targetId: args.assignmentId,
      description: "Declined assignment",
    });

    return { success: true };
  },
});

/**
 * Complete an assignment
 */
export const completeAssignment = mutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.assignedTo !== args.userId) {
      throw new Error("You can only complete your own assignments");
    }

    const now = Date.now();

    await ctx.db.patch(args.assignmentId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    // Notify the assigner
    await ctx.scheduler.runAfter(0, internal.collaboration.notifications.createNotification, {
      orgId: assignment.orgId,
      userId: assignment.assignedBy,
      type: "status_change",
      title: "Assignment Completed",
      message: `Assignment has been completed`,
      conversationId: assignment.conversationId,
      assignmentId: args.assignmentId,
    });

    // Log activity
    await ctx.scheduler.runAfter(0, internal.collaboration.activity.logActivity, {
      orgId: assignment.orgId,
      conversationId: assignment.conversationId,
      activityType: "assignment_completed",
      actorId: args.userId,
      actorName: "User",
      targetType: "assignment",
      targetId: args.assignmentId,
      description: "Completed assignment",
    });

    return { success: true };
  },
});

/**
 * Update assignment
 */
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    userId: v.string(),
    note: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Only assigner or assignee can update
    if (assignment.assignedBy !== args.userId && assignment.assignedTo !== args.userId) {
      throw new Error("Access denied");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.note !== undefined) updates.note = args.note;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.assignmentId, updates);

    return { success: true };
  },
});

/**
 * Delete assignment
 */
export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("collaboration_assignments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Only assigner can delete
    if (assignment.assignedBy !== args.userId) {
      throw new Error("Only the assigner can delete this assignment");
    }

    await ctx.db.delete(args.assignmentId);

    return { success: true };
  },
});

/**
 * Get assignment statistics
 */
export const getAssignmentStats = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("collaboration_assignments")
      .withIndex("by_org_assigned_to", q =>
        q.eq("orgId", args.orgId).eq("assignedTo", args.userId)
      )
      .collect();

    const pending = assignments.filter(a => a.status === "pending").length;
    const accepted = assignments.filter(a => a.status === "accepted").length;
    const completed = assignments.filter(a => a.status === "completed").length;
    const declined = assignments.filter(a => a.status === "declined").length;

    const now = Date.now();
    const overdue = assignments.filter(a =>
      a.status !== "completed" &&
      a.dueDate &&
      a.dueDate < now
    ).length;

    const byType = {
      owner: assignments.filter(a => a.assignmentType === "owner" && a.status !== "completed").length,
      collaborator: assignments.filter(a => a.assignmentType === "collaborator" && a.status !== "completed").length,
      watcher: assignments.filter(a => a.assignmentType === "watcher" && a.status !== "completed").length,
      reviewer: assignments.filter(a => a.assignmentType === "reviewer" && a.status !== "completed").length,
    };

    return {
      total: assignments.length,
      pending,
      accepted,
      completed,
      declined,
      overdue,
      active: pending + accepted,
      byType,
    };
  },
});
