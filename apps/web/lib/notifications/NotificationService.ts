// @ts-nocheck
/**
 * Notification Service
 * Helper hooks and utilities for notification management
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface QueueNotificationParams {
  orgId: string;
  priority: "high" | "medium" | "low";
  notificationType: string;
  templateId?: Id<"notification_templates">;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: Record<string, any>;
  conversationId?: Id<"unified_conversations">;
  customerId?: Id<"unified_customers">;
  userId?: string;
  scheduledFor?: number;
  maxAttempts?: number;
}

export interface SendTemplateEmailParams {
  orgId: string;
  templateType: string;
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, any>;
  priority?: "high" | "medium" | "low";
  conversationId?: Id<"unified_conversations">;
  customerId?: Id<"unified_customers">;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Get notification queue
 */
export function useNotificationQueue(
  orgId: string,
  options?: {
    status?: string;
    limit?: number;
  }
) {
  return useQuery(api.notifications.queue.getQueuedNotifications, {
    orgId,
    status: options?.status,
    limit: options?.limit,
  });
}

/**
 * Get notification statistics
 */
export function useNotificationStats(orgId: string, days?: number) {
  return useQuery(api.notifications.queue.getNotificationStats, {
    orgId,
    days,
  });
}

/**
 * Get single notification
 */
export function useNotification(notificationId: Id<"notification_queue"> | null) {
  return useQuery(
    api.notifications.queue.getNotification,
    notificationId ? { notificationId } : "skip"
  );
}

/**
 * Get all templates
 */
export function useTemplates(orgId?: string, templateType?: string) {
  return useQuery(api.notifications.templates.getTemplates, {
    orgId,
    templateType,
  });
}

/**
 * Get single template
 */
export function useTemplate(templateId: Id<"notification_templates"> | null) {
  return useQuery(
    api.notifications.templates.getTemplate,
    templateId ? { templateId } : "skip"
  );
}

/**
 * Get default template for type
 */
export function useDefaultTemplate(orgId: string | undefined, templateType: string) {
  return useQuery(api.notifications.templates.getDefaultTemplate, {
    orgId,
    templateType,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Queue a notification
 */
export function useQueueNotification() {
  return useMutation(api.notifications.queue.queueNotification);
}

/**
 * Cancel a notification
 */
export function useCancelNotification() {
  return useMutation(api.notifications.queue.cancelNotification);
}

/**
 * Retry a failed notification
 */
export function useRetryNotification() {
  return useMutation(api.notifications.queue.retryNotification);
}

/**
 * Create a template
 */
export function useCreateTemplate() {
  return useMutation(api.notifications.templates.createTemplate);
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  return useMutation(api.notifications.templates.updateTemplate);
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  return useMutation(api.notifications.templates.deleteTemplate);
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Send an email using a template
 */
export async function sendTemplateEmail(
  queueNotification: (params: QueueNotificationParams) => Promise<any>,
  renderTemplate: (params: {
    templateId: Id<"notification_templates">;
    variables: any;
  }) => Promise<{ subject: string; htmlBody: string; textBody: string }>,
  getDefaultTemplate: (params: {
    orgId?: string;
    templateType: string;
  }) => Promise<any>,
  params: SendTemplateEmailParams
): Promise<Id<"notification_queue">> {
  // Get template
  const template = await getDefaultTemplate({
    orgId: params.orgId,
    templateType: params.templateType,
  });

  if (!template) {
    throw new Error(`No default template found for type: ${params.templateType}`);
  }

  // Render template
  const rendered = await renderTemplate({
    templateId: template._id,
    variables: params.variables,
  });

  // Queue notification
  return await queueNotification({
    orgId: params.orgId,
    priority: params.priority || "medium",
    notificationType: params.templateType,
    templateId: template._id,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: rendered.subject,
    htmlBody: rendered.htmlBody,
    textBody: rendered.textBody,
    variables: params.variables,
    conversationId: params.conversationId,
    customerId: params.customerId,
  });
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Format date for display
 */
export function formatNotificationDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Calculate retry backoff
 */
export function calculateRetryBackoff(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 3600000); // Max 1 hour
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Get notification type display name
 */
export function getNotificationTypeName(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
