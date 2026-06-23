/**
 * Collaboration Service
 * React hooks and utilities for internal collaboration features
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

/**
 * Notes Hooks
 */

export function useCollaborationNotes(params: {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  customerId?: Id<"unified_customers">;
  userId: string;
  tags?: string[];
  visibility?: string[];
  isPinned?: boolean;
  limit?: number;
}) {
  return useQuery(api.collaboration.notes.getNotes, params);
}

export function usePinnedNotes(params: {
  orgId: string;
  userId: string;
  conversationId?: Id<"unified_conversations">;
}) {
  return useQuery(api.collaboration.notes.getPinnedNotes, params);
}

export function useSearchNotes(params: {
  orgId: string;
  userId: string;
  searchTerm: string;
  limit?: number;
}) {
  return useQuery(
    api.collaboration.notes.searchNotes,
    params.searchTerm.length >= 2 ? params : "skip"
  );
}

export function useNote(noteId: Id<"collaboration_notes"> | undefined, userId: string) {
  return useQuery(
    api.collaboration.notes.getNote,
    noteId ? { noteId, userId } : "skip"
  );
}

export function useCreateNote() {
  return useMutation(api.collaboration.notes.createNote);
}

export function useUpdateNote() {
  return useMutation(api.collaboration.notes.updateNote);
}

export function useDeleteNote() {
  return useMutation(api.collaboration.notes.deleteNote);
}

export function useTogglePin() {
  return useMutation(api.collaboration.notes.togglePin);
}

/**
 * Assignments Hooks
 */

export function useUserAssignments(params: {
  orgId: string;
  userId: string;
  status?: string[];
  assignmentType?: string[];
  includeCompleted?: boolean;
}) {
  return useQuery(api.collaboration.assignments.getUserAssignments, params);
}

export function useConversationAssignments(params: {
  conversationId: Id<"unified_conversations">;
  includeCompleted?: boolean;
}) {
  return useQuery(api.collaboration.assignments.getConversationAssignments, params);
}

export function useAssignmentStats(params: {
  orgId: string;
  userId: string;
}) {
  return useQuery(api.collaboration.assignments.getAssignmentStats, params);
}

export function useCreateAssignment() {
  return useMutation(api.collaboration.assignments.createAssignment);
}

export function useAcceptAssignment() {
  return useMutation(api.collaboration.assignments.acceptAssignment);
}

export function useDeclineAssignment() {
  return useMutation(api.collaboration.assignments.declineAssignment);
}

export function useCompleteAssignment() {
  return useMutation(api.collaboration.assignments.completeAssignment);
}

export function useUpdateAssignment() {
  return useMutation(api.collaboration.assignments.updateAssignment);
}

export function useDeleteAssignment() {
  return useMutation(api.collaboration.assignments.deleteAssignment);
}

/**
 * Notifications Hooks
 */

export function useNotifications(params: {
  orgId: string;
  userId: string;
  isRead?: boolean;
  type?: string[];
  limit?: number;
}) {
  return useQuery(api.collaboration.notifications.getUserNotifications, params);
}

export function useUnreadCount(params: {
  orgId: string;
  userId: string;
}) {
  return useQuery(api.collaboration.notifications.getUnreadCount, params);
}

export function useUserMentions(params: {
  orgId: string;
  userId: string;
  isRead?: boolean;
  isResolved?: boolean;
  limit?: number;
}) {
  return useQuery(api.collaboration.notifications.getUserMentions, params);
}

export function useMarkNotificationAsRead() {
  return useMutation(api.collaboration.notifications.markAsRead);
}

export function useMarkAllNotificationsAsRead() {
  return useMutation(api.collaboration.notifications.markAllAsRead);
}

export function useDeleteNotification() {
  return useMutation(api.collaboration.notifications.deleteNotification);
}

export function useMarkMentionAsRead() {
  return useMutation(api.collaboration.notifications.markMentionAsRead);
}

export function useResolveMention() {
  return useMutation(api.collaboration.notifications.resolveMention);
}

/**
 * Activity Hooks
 */

export function useActivities(params: {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  activityTypes?: string[];
  actorId?: string;
  limit?: number;
}) {
  return useQuery(api.collaboration.activity.getActivities, params);
}

export function useActivityStats(params: {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  days?: number;
}) {
  return useQuery(api.collaboration.activity.getActivityStats, params);
}

/**
 * Tags Hooks
 */

export function useTags(params: {
  orgId: string;
  category?: string;
}) {
  return useQuery(api.collaboration.tags.getTags, params);
}

export function usePopularTags(params: {
  orgId: string;
  limit?: number;
}) {
  return useQuery(api.collaboration.tags.getPopularTags, params);
}

export function useCreateTag() {
  return useMutation(api.collaboration.tags.createTag);
}

export function useUpdateTag() {
  return useMutation(api.collaboration.tags.updateTag);
}

export function useDeleteTag() {
  return useMutation(api.collaboration.tags.deleteTag);
}

/**
 * Permissions Hooks
 */

export function useCheckPermission() {
  return useMutation(api.collaboration.permissions.checkPermission);
}

export function useGrantPermission() {
  return useMutation(api.collaboration.permissions.grantPermission);
}

export function useRevokePermission() {
  return useMutation(api.collaboration.permissions.revokePermission);
}

export function useGetPermissions(params: {
  orgId: string;
  targetType: string;
  targetId: string;
}) {
  return useQuery(api.collaboration.permissions.getPermissions, params);
}

/**
 * Audit Hooks
 */

export function useAuditLogs(params: {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  targetId?: string;
  actions?: string[];
  actorId?: string;
  limit?: number;
}) {
  return useQuery(api.collaboration.audit.getAuditLogs, params);
}

export function useAuditLogsByTarget(params: {
  orgId: string;
  targetType: string;
  targetId: string;
  limit?: number;
}) {
  return useQuery(api.collaboration.audit.getAuditLogsByTarget, params);
}

/**
 * Utility Functions
 */

export const CollaborationUtils = {
  /**
   * Extract mentions from text content
   * Finds @username patterns
   */
  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  },

  /**
   * Format activity type for display
   */
  formatActivityType(activityType: string): string {
    return activityType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  /**
   * Get priority color class
   */
  getPriorityColor(priority: "low" | "medium" | "high" | "urgent"): string {
    const colors = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700",
    };
    return colors[priority];
  },

  /**
   * Get visibility icon
   */
  getVisibilityIcon(visibility: "private" | "team" | "mentioned" | "assigned"): string {
    const icons = {
      private: "🔒",
      team: "👥",
      mentioned: "@",
      assigned: "📌",
    };
    return icons[visibility];
  },

  /**
   * Check if assignment is overdue
   */
  isAssignmentOverdue(dueDate?: number): boolean {
    if (!dueDate) return false;
    return dueDate < Date.now();
  },

  /**
   * Calculate days until due
   */
  daysUntilDue(dueDate: number): number {
    const now = Date.now();
    const diff = dueDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "just now";
    }
  },

  /**
   * Generate tag color
   */
  generateTagColor(tagName: string): string {
    const colors = [
      "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
      "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6",
    ];
    
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  },

  /**
   * Export data to CSV
   */
  exportToCSV(data: any[], filename: string): void {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            if (typeof value === "string" && value.includes(",")) {
              return `"${value}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export data to JSON
   */
  exportToJSON(data: any, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/**
 * Type Guards
 */

export const CollaborationTypes = {
  isValidVisibility(value: string): value is "private" | "team" | "mentioned" | "assigned" {
    return ["private", "team", "mentioned", "assigned"].includes(value);
  },

  isValidPriority(value: string): value is "low" | "medium" | "high" | "urgent" {
    return ["low", "medium", "high", "urgent"].includes(value);
  },

  isValidAssignmentType(value: string): value is "owner" | "collaborator" | "watcher" | "reviewer" {
    return ["owner", "collaborator", "watcher", "reviewer"].includes(value);
  },

  isValidContentFormat(value: string): value is "markdown" | "html" | "plain" {
    return ["markdown", "html", "plain"].includes(value);
  },
};
