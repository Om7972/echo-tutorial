/**
 * Audit Service
 * Helper hooks and utilities for audit logging
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface AuditLogParams {
  orgId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details: any;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Get audit logs with filters
 */
export function useAuditLogs(
  orgId: string,
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    dateFrom?: number;
    dateTo?: number;
    limit?: number;
  }
) {
  return useQuery(api.audit.logs.getAuditLogs, {
    orgId,
    ...filters,
  });
}

/**
 * Get audit log by ID
 */
export function useAuditLog(logId: Id<"audit_logs"> | null) {
  return useQuery(
    api.audit.logs.getAuditLog,
    logId ? { logId } : "skip"
  );
}

/**
 * Get audit logs for specific resource
 */
export function useResourceAuditLogs(
  orgId: string,
  resource: string,
  resourceId: string,
  limit?: number
) {
  return useQuery(api.audit.logs.getResourceAuditLogs, {
    orgId,
    resource,
    resourceId,
    limit,
  });
}

/**
 * Get audit statistics
 */
export function useAuditStats(orgId: string, days?: number) {
  return useQuery(api.audit.logs.getAuditStats, {
    orgId,
    days,
  });
}

/**
 * Search audit logs
 */
export function useAuditSearch(orgId: string, searchTerm: string, limit?: number) {
  return useQuery(
    api.audit.logs.searchAuditLogs,
    searchTerm
      ? {
          orgId,
          searchTerm,
          limit,
        }
      : "skip"
  );
}

/**
 * Export audit logs
 */
export function useAuditExport(
  orgId: string,
  dateFrom?: number,
  dateTo?: number
) {
  return useQuery(api.audit.logs.exportAuditLogs, {
    orgId,
    dateFrom,
    dateTo,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Log an audit event
 */
export function useLogAudit() {
  return useMutation(api.audit.logs.logAudit);
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Log audit event helper
 */
export async function logAuditEvent(
  logAudit: (params: AuditLogParams) => Promise<any>,
  params: AuditLogParams
): Promise<Id<"audit_logs">> {
  return await logAudit(params);
}

/**
 * Get action display name
 */
export function getActionDisplayName(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get action icon
 */
export function getActionIcon(action: string): string {
  if (action.includes("login")) return "🔑";
  if (action.includes("logout")) return "🚪";
  if (action.includes("delete")) return "🗑️";
  if (action.includes("create")) return "✨";
  if (action.includes("edit") || action.includes("update")) return "✏️";
  if (action.includes("export")) return "📥";
  if (action.includes("role")) return "👤";
  if (action.includes("billing")) return "💳";
  if (action.includes("api_key")) return "🔐";
  if (action.includes("webhook")) return "🪝";
  return "📝";
}

/**
 * Get action color class
 */
export function getActionColor(action: string): string {
  if (action.includes("delete") || action.includes("revoke"))
    return "bg-red-100 text-red-800";
  if (action.includes("create") || action.includes("login"))
    return "bg-green-100 text-green-800";
  if (action.includes("edit") || action.includes("update"))
    return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

/**
 * Format audit log timestamp
 */
export function formatAuditTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Export logs to CSV
 */
export function exportAuditLogsToCSV(logs: any[], filename: string) {
  if (!logs || logs.length === 0) return;

  const headers = [
    "Timestamp",
    "User ID",
    "User Name",
    "User Email",
    "Action",
    "Resource",
    "Resource ID",
    "Success",
    "IP Address",
    "Details",
  ];

  const rows = logs.map((log) => [
    new Date(log.timestamp).toISOString(),
    log.userId,
    log.userName || "",
    log.userEmail || "",
    log.action,
    log.resource || "",
    log.resourceId || "",
    log.success ? "Yes" : "No",
    log.ipAddress || "",
    JSON.stringify(log.details),
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
 * Get browser info from user agent
 */
export function parseBrowserInfo(userAgent: string): {
  browser: string;
  os: string;
} {
  let browser = "Unknown";
  let os = "Unknown";

  // Parse browser
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  // Parse OS
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS")) os = "iOS";

  return { browser, os };
}

/**
 * Calculate retention period
 */
export function getRetentionCutoff(days: number = 90): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

/**
 * Group logs by date
 */
export function groupLogsByDate(logs: any[]): Record<string, any[]> {
  return logs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, any[]>);
}

/**
 * Calculate audit metrics
 */
export function calculateAuditMetrics(logs: any[]) {
  const total = logs.length;
  const failed = logs.filter((log) => !log.success).length;
  const successRate = total > 0 ? ((total - failed) / total) * 100 : 100;

  const byAction = logs.reduce((acc: any, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const byUser = logs.reduce((acc: any, log) => {
    acc[log.userId] = (acc[log.userId] || 0) + 1;
    return acc;
  }, {});

  const byDate = groupLogsByDate(logs);

  return {
    total,
    failed,
    successRate,
    byAction,
    byUser,
    byDate,
  };
}
