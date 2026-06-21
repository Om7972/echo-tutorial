// ─── Theme Engine Types ──────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";
export type ThemeColor = "emerald" | "violet" | "blue" | "rose";

export interface ThemeConfig {
  mode: ThemeMode;
  color: ThemeColor;
}

export interface ThemeContextValue extends ThemeConfig {
  /** Resolved actual mode (never "system") */
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
}

export const THEME_STORAGE_KEY = "echo-theme";

export const DEFAULT_THEME: ThemeConfig = {
  mode: "system",
  color: "blue",
};

export const COLOR_LABELS: Record<ThemeColor, string> = {
  emerald: "Emerald",
  violet: "Violet",
  blue: "Blue",
  rose: "Rose",
};

export const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
