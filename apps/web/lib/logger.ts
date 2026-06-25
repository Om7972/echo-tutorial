// @ts-nocheck
/**
 * Structured logger backed by Sentry breadcrumbs, console output,
 * and the in-app LogsPanel (dev/staging only).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User signed in", { userId: "u_123" });
 *   logger.warn("Rate limit approaching", { remaining: 5 });
 *   logger.error("Payment failed", error, { orderId: "o_999" });
 */

import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error" | "debug";
type LogData = Record<string, unknown>;

/** ANSI colours for the dev console */
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[34m",   // blue
  info:  "\x1b[32m",   // green
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

// ─── LogsPanel bridge (client-side only) ─────────────────────────────────────

/**
 * Dynamically imports `emitLog` from the LogsPanel and fires the entry.
 * Dynamic import avoids bundling the panel in SSR/edge contexts.
 */
async function emitToPanel(
  level: LogLevel,
  message: string,
  data?: unknown
): Promise<void> {
  if (typeof window === "undefined") return; // server-side guard
  try {
    const { emitLog } = await import("@/components/logs-panel/logs-panel");
    emitLog({ level, message, data });
  } catch {
    // Panel not mounted — silently ignore
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const color = COLORS[level];
  return `${color}[${level.toUpperCase()}]${RESET} ${timestamp} — ${message}`;
}

function addBreadcrumb(level: LogLevel, message: string, data?: LogData): void {
  // Sentry breadcrumb levels: "debug" | "info" | "warning" | "error" | "fatal"
  const sentryLevel =
    level === "warn" ? "warning" : (level as Sentry.SeverityLevel);

  Sentry.addBreadcrumb({
    level: sentryLevel,
    category: "app.logger",
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const logger = {
  /**
   * Informational log — tracks normal application flow.
   * Adds a Sentry breadcrumb, logs to console, and emits to the LogsPanel.
   */
  info(message: string, data?: LogData): void {
    addBreadcrumb("info", message, data);
    void emitToPanel("info", message, data);
    console.log(formatMessage("info", message), data ?? "");
  },

  /**
   * Warning log — something unexpected but non-fatal occurred.
   * Adds a Sentry breadcrumb with "warning" level.
   */
  warn(message: string, data?: LogData): void {
    addBreadcrumb("warn", message, data);
    void emitToPanel("warn", message, data);
    console.warn(formatMessage("warn", message), data ?? "");
  },

  /**
   * Error log — captures the error in Sentry and logs to the console.
   * Attach an Error object to get a full stack trace in Sentry.
   *
   * @param message  Human-readable description
   * @param error    The caught Error (or undefined for non-exception errors)
   * @param data     Extra key-value pairs attached as Sentry extra context
   */
  error(message: string, error?: unknown, data?: LogData): void {
    addBreadcrumb("error", message, data);
    void emitToPanel("error", message, data);
    console.error(formatMessage("error", message), error ?? "", data ?? "");

    if (error instanceof Error) {
      Sentry.withScope((scope) => {
        if (data) scope.setExtras(data as Record<string, unknown>);
        scope.setLevel("error");
        Sentry.captureException(error);
      });
    } else if (error !== undefined) {
      Sentry.withScope((scope) => {
        if (data) scope.setExtras(data as Record<string, unknown>);
        scope.setLevel("error");
        Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, "error");
      });
    } else {
      Sentry.withScope((scope) => {
        if (data) scope.setExtras(data as Record<string, unknown>);
        scope.setLevel("error");
        Sentry.captureMessage(message, "error");
      });
    }
  },

  /**
   * Debug log — only written to the console and LogsPanel in non-production.
   * Not sent to Sentry to avoid noise.
   */
  debug(message: string, data?: LogData): void {
    addBreadcrumb("debug", message, data);
    if (process.env.NODE_ENV !== "production") {
      void emitToPanel("debug", message, data);
      console.debug(formatMessage("debug", message), data ?? "");
    }
  },
} as const;
