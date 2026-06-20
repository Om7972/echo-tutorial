"use client";

/**
 * LogsPanel — in-app developer log viewer (dev/staging only).
 *
 * Intercepts calls to the `logger` and renders them in a floating panel
 * so developers can see logs without opening the browser console.
 *
 * Usage:
 *   import { LogsPanel } from "@/components/logs-panel";
 *   // Add to your root layout or a dev-only wrapper:
 *   {process.env.NODE_ENV !== "production" && <LogsPanel />}
 *
 * The panel is completely tree-shaken in production builds.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronDown, ChevronUp, Trash2, Copy } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

// ─── Log interceptor ─────────────────────────────────────────────────────────

/** Module-level registry so LogsPanel can subscribe to log events */
const subscribers = new Set<(entry: LogEntry) => void>();

export function emitLog(entry: Omit<LogEntry, "id" | "timestamp">): void {
  const full: LogEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2, 9),
    timestamp: new Date(),
  };
  subscribers.forEach((fn) => fn(full));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<LogLevel, { dot: string; label: string; row: string }> = {
  info: {
    dot: "#22d3ee",
    label: "#22d3ee",
    row: "rgba(6,182,212,0.06)",
  },
  warn: {
    dot: "#f59e0b",
    label: "#f59e0b",
    row: "rgba(245,158,11,0.06)",
  },
  error: {
    dot: "#f87171",
    label: "#f87171",
    row: "rgba(248,113,113,0.08)",
  },
  debug: {
    dot: "#a78bfa",
    label: "#a78bfa",
    row: "rgba(167,139,250,0.06)",
  },
};

function fmt(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to emitLog events
  useEffect(() => {
    const handler = (entry: LogEntry) => {
      setLogs((prev) => [...prev.slice(-199), entry]); // cap at 200 entries
    };
    subscribers.add(handler);
    return () => { subscribers.delete(handler); };
  }, []);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, open, minimized]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const copyLogs = useCallback(() => {
    const text = logs
      .map((l) => `[${l.level.toUpperCase()}] ${fmt(l.timestamp)} — ${l.message}${l.data ? ` | ${JSON.stringify(l.data)}` : ""}`)
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }, [logs]);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);
  const errorCount = logs.filter((l) => l.level === "error").length;

  if (!open) {
    return (
      <button
        id="logs-panel-toggle-btn"
        onClick={() => setOpen(true)}
        title="Open Logs Panel"
        style={{
          position: "fixed",
          bottom: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.45rem 0.9rem",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(15,15,20,0.88)",
          backdropFilter: "blur(12px)",
          color: "#94a3b8",
          fontSize: "0.75rem",
          fontWeight: 600,
          fontFamily: "ui-monospace, monospace",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          transition: "all 0.18s ease",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: errorCount > 0 ? "#f87171" : "#22d3ee", display: "inline-block", flexShrink: 0 }} />
        Logs {logs.length > 0 && <span style={{ color: errorCount > 0 ? "#f87171" : "#94a3b8" }}>({logs.length})</span>}
      </button>
    );
  }

  return (
    <div
      id="logs-panel-root"
      role="log"
      aria-label="Application logs panel"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        right: "1.25rem",
        zIndex: 9999,
        width: "min(580px, calc(100vw - 2.5rem))",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(10,10,16,0.94)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.72rem",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0.55rem 0.875rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          gap: "0.5rem",
        }}
      >
        {/* Title */}
        <span style={{ color: "#64748b", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, flex: 1 }}>
          Logs
          {logs.length > 0 && (
            <span style={{ marginLeft: "0.4rem", color: "#475569" }}>({logs.length})</span>
          )}
          {errorCount > 0 && (
            <span style={{ marginLeft: "0.4rem", color: "#f87171", fontWeight: 700 }}>
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
        </span>

        {/* Filter pills */}
        {(["all", "info", "warn", "error", "debug"] as const).map((lvl) => (
          <button
            key={lvl}
            id={`logs-filter-${lvl}`}
            onClick={() => setFilter(lvl)}
            style={{
              padding: "0.15rem 0.5rem",
              borderRadius: "999px",
              border: filter === lvl ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
              background: filter === lvl ? "rgba(255,255,255,0.08)" : "transparent",
              color: lvl === "all" ? "#94a3b8" : LEVEL_STYLES[lvl]?.label ?? "#94a3b8",
              fontSize: "0.65rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {lvl}
          </button>
        ))}

        {/* Actions */}
        <button id="logs-panel-copy-btn" onClick={copyLogs} title="Copy all logs" style={iconBtnStyle}>
          <Copy style={{ width: "0.75rem", height: "0.75rem" }} />
        </button>
        <button id="logs-panel-clear-btn" onClick={clearLogs} title="Clear logs" style={iconBtnStyle}>
          <Trash2 style={{ width: "0.75rem", height: "0.75rem" }} />
        </button>
        <button id="logs-panel-minimize-btn" onClick={() => setMinimized((p) => !p)} title={minimized ? "Expand" : "Minimize"} style={iconBtnStyle}>
          {minimized ? <ChevronUp style={{ width: "0.75rem", height: "0.75rem" }} /> : <ChevronDown style={{ width: "0.75rem", height: "0.75rem" }} />}
        </button>
        <button id="logs-panel-close-btn" onClick={() => setOpen(false)} title="Close" style={{ ...iconBtnStyle, color: "#f87171" }}>
          <X style={{ width: "0.75rem", height: "0.75rem" }} />
        </button>
      </div>

      {/* ── Log list ───────────────────────────────────────────────────────── */}
      {!minimized && (
        <div
          style={{
            overflowY: "auto",
            maxHeight: "300px",
            padding: "0.25rem 0",
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ margin: 0, padding: "1.5rem", textAlign: "center", color: "#334155", fontSize: "0.75rem" }}>
              No logs yet. Use <code style={{ color: "#64748b" }}>logger.info()</code> to emit events.
            </p>
          ) : (
            filtered.map((log) => {
              const s = LEVEL_STYLES[log.level];
              return (
                <div
                  key={log.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto auto 1fr",
                    alignItems: "baseline",
                    gap: "0 0.6rem",
                    padding: "0.3rem 0.875rem",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: s.row,
                  }}
                >
                  <span style={{ color: "#334155", fontSize: "0.62rem", whiteSpace: "nowrap" }}>{fmt(log.timestamp)}</span>
                  <span style={{ color: s.label, fontWeight: 700, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {log.level}
                  </span>
                  <span style={{ color: "#94a3b8", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {log.message}
                    {log.data !== undefined && (
                      <span style={{ color: "#475569", marginLeft: "0.35rem" }}>
                        {JSON.stringify(log.data)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ─── Shared icon button style ─────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.4rem",
  height: "1.4rem",
  borderRadius: "0.375rem",
  border: "none",
  background: "transparent",
  color: "#475569",
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease",
  padding: 0,
  flexShrink: 0,
};
