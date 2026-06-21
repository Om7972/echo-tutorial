"use client";

// ─── ThemeProvider ─────────────────────────────────────────────────────────────
//
// Applies the correct CSS custom properties to <html> on every theme change.
// Resolves "system" mode via the prefers-color-scheme media query.
// Wraps children in React Context so any component can call useTheme().

import * as React from "react";
import { createContext, useContext, useEffect, useRef } from "react";

import { useThemeStore } from "@/lib/theme/store";
import { THEME_TOKENS } from "@/lib/theme/tokens";
import type { ThemeContextValue, ThemeMode, ThemeColor } from "@/lib/theme/types";

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTokens(mode: "light" | "dark", color: ThemeColor) {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[color][mode];

  // Apply all CSS custom properties to :root
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }

  // Toggle .dark class for Tailwind dark: variants
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Persist color as data attribute for CSS fallback
  root.setAttribute("data-theme-color", color);
  root.setAttribute("data-theme-mode", mode);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config, setMode, setColor, mounted } = useThemeStore();

  // Track resolved system mode
  const systemModeRef = useRef<"light" | "dark">(getSystemMode());

  const resolvedMode: "light" | "dark" =
    config.mode === "system" ? systemModeRef.current : config.mode;

  // Apply tokens whenever config changes
  useEffect(() => {
    if (!mounted) return;
    applyTokens(resolvedMode, config.color);
  }, [resolvedMode, config.color, mounted]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (config.mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      systemModeRef.current = e.matches ? "dark" : "light";
      applyTokens(e.matches ? "dark" : "light", config.color);
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [config.mode, config.color]);

  // SSR safety: apply dark class before first paint (avoids flash)
  useEffect(() => {
    if (mounted) return; // already handled above
    applyTokens(resolvedMode, config.color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: ThemeContextValue = {
    mode: config.mode,
    color: config.color,
    resolvedMode,
    setMode,
    setColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
