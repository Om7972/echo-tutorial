// @ts-nocheck
/**
 * Analytics Service
 * Helper hooks and utilities for enterprise analytics
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface AnalyticsSummary {
  avgResponseTimeMs: number;
  avgFirstResponseTimeMs: number;
  avgResolutionTimeMs: number;
  totalConversations: number;
  newConversations: number;
  resolvedConversations: number;
  aiAccuracyRate: number;
  humanHandoffRate: number;
  avgCsatScore: number;
  avgSentimentScore: number;
  totalCostUSD: number;
  totalRevenue: number;
  channelBreakdown: {
    email: number;
    chat: number;
    phone: number;
    social: number;
    other: number;
  };
  priorityBreakdown: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Get enterprise analytics for date range
 */
export function useEnterpriseAnalytics(orgId: string, dateRange: DateRange) {
  return useQuery(api.analytics.enterprise.getEnterpriseAnalytics, {
    orgId,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
}

/**
 * Get analytics summary
 */
export function useAnalyticsSummary(orgId: string, dateRange: DateRange) {
  return useQuery(api.analytics.enterprise.getAnalyticsSummary, {
    orgId,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
}

/**
 * Get metrics by type
 */
export function useMetricsByType(
  orgId: string,
  metricType: string,
  dateRange: DateRange
) {
  return useQuery(api.analytics.enterprise.getMetricsByType, {
    orgId,
    metricType,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
}

/**
 * Compare two periods
 */
export function useComparePeriods(
  orgId: string,
  period1: DateRange,
  period2: DateRange
) {
  return useQuery(api.analytics.enterprise.comparePeriods, {
    orgId,
    period1From: period1.dateFrom,
    period1To: period1.dateTo,
    period2From: period2.dateFrom,
    period2To: period2.dateTo,
  });
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get date range for preset period
 */
export function getDateRangeForPeriod(
  period: "7d" | "30d" | "90d" | "custom"
): DateRange {
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const dateTo = now.toISOString().split("T")[0];
  const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return { dateFrom, dateTo };
}

/**
 * Get previous period for comparison
 */
export function getPreviousPeriod(currentPeriod: DateRange): DateRange {
  const fromDate = new Date(currentPeriod.dateFrom);
  const toDate = new Date(currentPeriod.dateTo);
  const durationMs = toDate.getTime() - fromDate.getTime();

  const period2To = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const period2From = new Date(fromDate.getTime() - durationMs - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return { dateFrom: period2From, dateTo: period2To };
}

/**
 * Format time duration
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Export analytics to CSV
 */
export function exportAnalyticsToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => row[header]));

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Format chart data for Recharts
 */
export function formatChartData(
  data: any[],
  dateField: string = "date",
  dateFormat: "short" | "long" = "short"
) {
  return data.map((item) => ({
    ...item,
    [dateField]: formatChartDate(item[dateField], dateFormat),
  }));
}

/**
 * Format date for charts
 */
export function formatChartDate(dateStr: string, format: "short" | "long" = "short"): string {
  const date = new Date(dateStr);

  if (format === "short") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get trend direction
 */
export function getTrendDirection(
  current: number,
  previous: number
): "up" | "down" | "stable" {
  const change = calculatePercentageChange(current, previous);

  if (Math.abs(change) < 2) return "stable";
  return change > 0 ? "up" : "down";
}

/**
 * Get trend indicator
 */
export function getTrendIndicator(
  current: number,
  previous: number,
  inverse: boolean = false
): { direction: "up" | "down" | "stable"; color: string; icon: string } {
  const direction = getTrendDirection(current, previous);

  if (direction === "stable") {
    return { direction, color: "text-gray-600", icon: "→" };
  }

  const isGood = inverse ? direction === "down" : direction === "up";

  return {
    direction,
    color: isGood ? "text-green-600" : "text-red-600",
    icon: direction === "up" ? "↑" : "↓",
  };
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(data: number[], window: number = 7): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }

  return result;
}
