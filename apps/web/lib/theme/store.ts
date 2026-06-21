"use client";

// ─── Theme localStorage Store ─────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import type { ThemeConfig, ThemeMode, ThemeColor } from "./types";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "./types";

function readStorage(): ThemeConfig {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    return {
      mode:  (["light", "dark", "system"].includes(parsed.mode  ?? "") ? parsed.mode  : DEFAULT_THEME.mode)  as ThemeMode,
      color: (["emerald", "violet", "blue", "rose"].includes(parsed.color ?? "") ? parsed.color : DEFAULT_THEME.color) as ThemeColor,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function writeStorage(config: ThemeConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota exceeded – silent fail */
  }
}

export function useThemeStore() {
  const [config, setConfigState] = useState<ThemeConfig>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setConfigState(readStorage());
    setMounted(true);
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setConfigState((prev) => {
      const next = { ...prev, mode };
      writeStorage(next);
      return next;
    });
  }, []);

  const setColor = useCallback((color: ThemeColor) => {
    setConfigState((prev) => {
      const next = { ...prev, color };
      writeStorage(next);
      return next;
    });
  }, []);

  return { config, setMode, setColor, mounted };
}
