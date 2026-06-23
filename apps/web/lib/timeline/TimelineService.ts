/**
 * Timeline Service
 * Helper functions and hooks for timeline operations
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

export interface TimelineFilters {
  eventTypes?: string[];
  startDate?: number;
  endDate?: number;
  searchTerm?: string;
}

/**
 * Hook for customer timeline with filters
 */
export function useCustomerTimeline(
  orgId: string,
  customerId: Id<"unified_customers">,
  filters?: TimelineFilters
) {
  return useQuery(api.timeline.events.getCustomerTimeline, {
    orgId,
    customerId,
    eventTypes: filters?.eventTypes,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    limit: 50,
  });
}

/**
 * Hook for timeline statistics
 */
export function useTimelineStats(
  orgId: string,
  customerId: Id<"unified_customers">,
  days: number = 30
) {
  return useQuery(api.timeline.events.getTimelineStats, {
    orgId,
    customerId,
    days,
  });
}

/**
 * Hook for creating activity events
 */
export function useCreateActivityEvent() {
  return useMutation(api.timeline.events.createActivityEvent);
}

/**
 * Hook for customer notes
 */
export function useCustomerNotes(orgId: string, customerId: Id<"unified_customers">) {
  return useQuery(api.timeline.notes.getCustomerNotes, {
    orgId,
    customerId,
  });
}

/**
 * Hook for creating notes
 */
export function useCreateNote() {
  return useMutation(api.timeline.notes.createNote);
}

/**
 * Hook for updating notes
 */
export function useUpdateNote() {
  return useMutation(api.timeline.notes.updateNote);
}

/**
 * Hook for deleting notes
 */
export function useDeleteNote() {
  return useMutation(api.timeline.notes.deleteNote);
}

/**
 * Hook for call logs
 */
export function useCustomerCalls(
  orgId: string,
  customerId: Id<"unified_customers">,
  filters?: {
    direction?: "inbound" | "outbound";
    status?: "completed" | "missed" | "voicemail" | "failed" | "busy" | "no_answer";
  }
) {
  return useQuery(api.timeline.calls.getCustomerCalls, {
    orgId,
    customerId,
    ...filters,
  });
}

/**
 * Hook for logging calls
 */
export function useLogCall() {
  return useMutation(api.timeline.calls.logCall);
}

/**
 * Hook for call statistics
 */
export function useCallStats(
  orgId: string,
  customerId: Id<"unified_customers">,
  days: number = 30
) {
  return useQuery(api.timeline.calls.getCallStats, {
    orgId,
    customerId,
    days,
  });
}

/**
 * Hook for email logs
 */
export function useCustomerEmails(
  orgId: string,
  customerId: Id<"unified_customers">,
  filters?: {
    direction?: "sent" | "received";
    status?: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  }
) {
  return useQuery(api.timeline.emails.getCustomerEmails, {
    orgId,
    customerId,
    ...filters,
  });
}

/**
 * Hook for logging emails
 */
export function useLogEmail() {
  return useMutation(api.timeline.emails.logEmail);
}

/**
 * Hook for email statistics
 */
export function useEmailStats(
  orgId: string,
  customerId: Id<"unified_customers">,
  days: number = 30
) {
  return useQuery(api.timeline.emails.getEmailStats, {
    orgId,
    customerId,
    days,
  });
}

/**
 * Hook for timeline search
 */
export function useTimelineSearch(
  orgId: string,
  customerId: Id<"unified_customers">,
  searchTerm: string
) {
  return useQuery(
    searchTerm.length > 2
      ? api.timeline.events.searchTimeline
      : null,
    searchTerm.length > 2
      ? {
          orgId,
          customerId,
          searchTerm,
        }
      : "skip"
  );
}

/**
 * Utility: Format event type for display
 */
export function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Utility: Get relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Utility: Get event icon
 */
export function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    message_sent: "📤",
    message_received: "📥",
    conversation_started: "💬",
    conversation_resolved: "✅",
    note_added: "📝",
    tag_added: "🏷️",
    tag_removed: "❌",
    assigned: "👤",
    transferred: "🔄",
    status_changed: "📊",
    priority_changed: "⚡",
    sentiment_detected: "😊",
    call_made: "📞",
    email_sent: "✉️",
  };
  return icons[eventType] || "📋";
}

/**
 * Utility: Get event color classes
 */
export function getEventColor(eventType: string): {
  text: string;
  bg: string;
  border: string;
} {
  const colors: Record<string, { text: string; bg: string; border: string }> = {
    message_sent: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    message_received: { text: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    conversation_started: { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    conversation_resolved: { text: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    note_added: { text: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
    tag_added: { text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    tag_removed: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    assigned: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    transferred: { text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    status_changed: { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    priority_changed: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    sentiment_detected: { text: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
    call_made: { text: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
    email_sent: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  };
  return colors[eventType] || { text: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };
}

/**
 * Utility: Export timeline to CSV
 */
export function exportToCSV(events: any[], filename: string = "timeline.csv") {
  const headers = ["Date", "Time", "Event Type", "Title", "Description", "Performed By"];
  const rows = events.map((e) => [
    new Date(e.timestamp).toLocaleDateString(),
    new Date(e.timestamp).toLocaleTimeString(),
    formatEventType(e.eventType),
    e.title,
    e.description || "",
    e.performedBy || "System",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Utility: Export timeline to JSON
 */
export function exportToJSON(events: any[], filename: string = "timeline.json") {
  const json = JSON.stringify(events, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Utility: Group events by date
 */
export function groupEventsByDate(events: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  events.forEach((event) => {
    const date = new Date(event.timestamp).toLocaleDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });

  return grouped;
}

/**
 * Utility: Filter events by date range
 */
export function filterEventsByDateRange(
  events: any[],
  startDate?: number,
  endDate?: number
): any[] {
  let filtered = [...events];

  if (startDate) {
    filtered = filtered.filter((e) => e.timestamp >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter((e) => e.timestamp <= endDate);
  }

  return filtered;
}

/**
 * Utility: Get event type statistics
 */
export function getEventTypeStats(events: any[]): Record<string, number> {
  const stats: Record<string, number> = {};

  events.forEach((event) => {
    stats[event.eventType] = (stats[event.eventType] || 0) + 1;
  });

  return stats;
}
