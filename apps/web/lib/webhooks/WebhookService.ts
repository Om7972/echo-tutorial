/**
 * Webhook Service
 * Helper hooks and utilities for webhook management
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import crypto from "crypto";

export interface CreateWebhookParams {
  orgId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  headers?: Array<{ key: string; value: string }>;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  timeout?: number;
  createdBy: string;
}

export interface WebhookEvent {
  orgId: string;
  event: string;
  payload: any;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Get all webhooks
 */
export function useWebhooks(orgId: string, activeOnly?: boolean) {
  return useQuery(api.webhooks.endpoints.getWebhooks, {
    orgId,
    activeOnly,
  });
}

/**
 * Get single webhook
 */
export function useWebhook(webhookId: Id<"webhooks"> | null) {
  return useQuery(
    api.webhooks.endpoints.getWebhook,
    webhookId ? { webhookId } : "skip"
  );
}

/**
 * Get webhook statistics
 */
export function useWebhookStats(webhookId: Id<"webhooks"> | null, days?: number) {
  return useQuery(
    api.webhooks.endpoints.getWebhookStats,
    webhookId ? { webhookId, days } : "skip"
  );
}

/**
 * Get webhook deliveries
 */
export function useWebhookDeliveries(
  webhookId: Id<"webhooks"> | null,
  status?: string,
  limit?: number
) {
  return useQuery(
    api.webhooks.delivery.getWebhookDeliveries,
    webhookId ? { webhookId, status, limit } : "skip"
  );
}

/**
 * Get single delivery
 */
export function useDelivery(deliveryId: Id<"webhook_deliveries"> | null) {
  return useQuery(
    api.webhooks.delivery.getDelivery,
    deliveryId ? { deliveryId } : "skip"
  );
}

/**
 * Get recent deliveries for org
 */
export function useRecentDeliveries(
  orgId: string,
  event?: string,
  limit?: number
) {
  return useQuery(api.webhooks.delivery.getRecentDeliveries, {
    orgId,
    event,
    limit,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create webhook
 */
export function useCreateWebhook() {
  return useMutation(api.webhooks.endpoints.createWebhook);
}

/**
 * Update webhook
 */
export function useUpdateWebhook() {
  return useMutation(api.webhooks.endpoints.updateWebhook);
}

/**
 * Delete webhook
 */
export function useDeleteWebhook() {
  return useMutation(api.webhooks.endpoints.deleteWebhook);
}

/**
 * Toggle webhook status
 */
export function useToggleWebhookStatus() {
  return useMutation(api.webhooks.endpoints.toggleWebhookStatus);
}

/**
 * Rotate webhook secret
 */
export function useRotateWebhookSecret() {
  return useMutation(api.webhooks.endpoints.rotateWebhookSecret);
}

/**
 * Test webhook
 */
export function useTestWebhook() {
  return useMutation(api.webhooks.endpoints.testWebhook);
}

/**
 * Retry delivery
 */
export function useRetryDelivery() {
  return useMutation(api.webhooks.delivery.retryDelivery);
}

/**
 * Cancel delivery
 */
export function useCancelDelivery() {
  return useMutation(api.webhooks.delivery.cancelDelivery);
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Trigger webhook
 */
export function useTriggerWebhook() {
  return useAction(api.webhooks.delivery.triggerWebhook);
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Verify webhook signature (for receiving webhooks)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generate webhook signature (for testing)
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Get status color class
 */
export function getDeliveryStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "sending":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get status icon
 */
export function getDeliveryStatusIcon(status: string): string {
  switch (status) {
    case "success":
      return "✓";
    case "failed":
      return "✗";
    case "pending":
      return "⏳";
    case "sending":
      return "📤";
    case "cancelled":
      return "🚫";
    default:
      return "•";
  }
}

/**
 * Format webhook event name
 */
export function formatEventName(event: string): string {
  return event
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get event category
 */
export function getEventCategory(event: string): string {
  return event.split(".")[0] || "other";
}

/**
 * Group events by category
 */
export function groupEventsByCategory(events: string[]): Record<string, string[]> {
  return events.reduce((acc, event) => {
    const category = getEventCategory(event);
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {} as Record<string, string[]>);
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS protocol" };
    }

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return { valid: false, error: "Localhost URLs are not allowed" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempts: number,
  baseDelay: number,
  exponentialBackoff: boolean
): number {
  if (!exponentialBackoff) {
    return baseDelay;
  }

  const delay = baseDelay * Math.pow(2, attempts);
  return Math.min(delay, 3600000); // Max 1 hour
}

/**
 * Format delivery time
 */
export function formatDeliveryTime(timestamp: number): string {
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
 * Parse webhook response
 */
export function parseWebhookResponse(response: any): {
  statusCode: number;
  success: boolean;
  duration: number;
  body?: string;
} {
  return {
    statusCode: response.statusCode,
    success: response.statusCode >= 200 && response.statusCode < 300,
    duration: response.duration,
    body: response.body,
  };
}

/**
 * Export deliveries to CSV
 */
export function exportDeliveriesToCSV(deliveries: any[], filename: string) {
  if (!deliveries || deliveries.length === 0) return;

  const headers = [
    "Timestamp",
    "Event",
    "Status",
    "Attempts",
    "Status Code",
    "Duration (ms)",
    "Error",
  ];

  const rows = deliveries.map((delivery) => [
    new Date(delivery.triggeredAt).toISOString(),
    delivery.event,
    delivery.status,
    `${delivery.attempts}/${delivery.maxAttempts}`,
    delivery.response?.statusCode || "",
    delivery.response?.duration || "",
    delivery.error || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Available webhook events
 */
export const WEBHOOK_EVENTS = [
  "conversation.created",
  "conversation.updated",
  "conversation.closed",
  "message.received",
  "message.sent",
  "ticket.created",
  "ticket.closed",
  "handoff.started",
  "handoff.completed",
  "payment.success",
  "payment.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "*", // All events
] as const;

/**
 * Event descriptions
 */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<string, string> = {
  "conversation.created": "Triggered when a new conversation is created",
  "conversation.updated": "Triggered when a conversation is updated",
  "conversation.closed": "Triggered when a conversation is closed",
  "message.received": "Triggered when a new message is received",
  "message.sent": "Triggered when a message is sent",
  "ticket.created": "Triggered when a support ticket is created",
  "ticket.closed": "Triggered when a support ticket is closed",
  "handoff.started": "Triggered when AI hands off to human agent",
  "handoff.completed": "Triggered when handoff is completed",
  "payment.success": "Triggered when a payment is successful",
  "payment.failed": "Triggered when a payment fails",
  "subscription.created": "Triggered when a subscription is created",
  "subscription.updated": "Triggered when a subscription is updated",
  "subscription.cancelled": "Triggered when a subscription is cancelled",
  "*": "Subscribe to all events",
};
