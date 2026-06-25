// @ts-nocheck
// ─── Theme Token Definitions ──────────────────────────────────────────────────
//
// Each palette defines CSS custom properties for both light and dark modes.
// Values are OKLCH for perceptual uniformity with Tailwind v4.
//
// Tokens follow the shadcn/ui convention mapped through the @theme inline block
// in globals.css so every Tailwind utility (bg-primary, text-muted, etc.) works.

import type { ThemeColor } from "./types";

export interface ThemeTokenSet {
  light: Record<string, string>;
  dark: Record<string, string>;
}

// ─── Shared structural tokens (backgrounds, surfaces, borders) ────────────────
const structuralLight = {
  "--background":          "oklch(1 0 0)",
  "--foreground":          "oklch(0.145 0 0)",
  "--card":                "oklch(0.99 0 0)",
  "--card-foreground":     "oklch(0.145 0 0)",
  "--popover":             "oklch(1 0 0)",
  "--popover-foreground":  "oklch(0.145 0 0)",
  "--secondary":           "oklch(0.97 0 0)",
  "--secondary-foreground":"oklch(0.205 0 0)",
  "--muted":               "oklch(0.97 0 0)",
  "--muted-foreground":    "oklch(0.556 0 0)",
  "--border":              "oklch(0.922 0 0)",
  "--input":               "oklch(0.922 0 0)",
  "--destructive":         "oklch(0.577 0.245 27.325)",
  "--destructive-foreground": "oklch(0.985 0 0)",
  "--radius":              "0.625rem",
};

const structuralDark = {
  "--background":          "oklch(0.145 0 0)",
  "--foreground":          "oklch(0.985 0 0)",
  "--card":                "oklch(0.18 0 0)",
  "--card-foreground":     "oklch(0.985 0 0)",
  "--popover":             "oklch(0.145 0 0)",
  "--popover-foreground":  "oklch(0.985 0 0)",
  "--secondary":           "oklch(0.269 0 0)",
  "--secondary-foreground":"oklch(0.985 0 0)",
  "--muted":               "oklch(0.269 0 0)",
  "--muted-foreground":    "oklch(0.708 0 0)",
  "--border":              "oklch(0.269 0 0)",
  "--input":               "oklch(0.269 0 0)",
  "--destructive":         "oklch(0.396 0.141 25.723)",
  "--destructive-foreground": "oklch(0.637 0.237 25.331)",
  "--radius":              "0.625rem",
};

// ─── Per-palette accent tokens ────────────────────────────────────────────────

export const THEME_TOKENS: Record<ThemeColor, ThemeTokenSet> = {

  // ── Blue (default) ──────────────────────────────────────────────────────────
  blue: {
    light: {
      ...structuralLight,
      "--primary":              "oklch(0.546 0.245 264)",      // vivid blue
      "--primary-foreground":   "oklch(0.985 0 0)",
      "--accent":               "oklch(0.94 0.04 264)",
      "--accent-foreground":    "oklch(0.2 0.05 264)",
      "--ring":                 "oklch(0.546 0.245 264)",
      // Sidebar
      "--sidebar":              "oklch(0.985 0 0)",
      "--sidebar-foreground":   "oklch(0.145 0 0)",
      "--sidebar-primary":      "oklch(0.546 0.245 264)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent":       "oklch(0.94 0.04 264)",
      "--sidebar-accent-foreground": "oklch(0.2 0.05 264)",
      "--sidebar-border":       "oklch(0.922 0 0)",
      "--sidebar-ring":         "oklch(0.546 0.245 264)",
      // Brand
      "--brand":                "oklch(0.546 0.245 264)",
      "--brand-muted":          "oklch(0.94 0.06 264)",
    },
    dark: {
      ...structuralDark,
      "--primary":              "oklch(0.635 0.22 264)",
      "--primary-foreground":   "oklch(0.1 0 0)",
      "--accent":               "oklch(0.25 0.06 264)",
      "--accent-foreground":    "oklch(0.85 0.04 264)",
      "--ring":                 "oklch(0.635 0.22 264)",
      "--sidebar":              "oklch(0.18 0 0)",
      "--sidebar-foreground":   "oklch(0.985 0 0)",
      "--sidebar-primary":      "oklch(0.635 0.22 264)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent":       "oklch(0.25 0.06 264)",
      "--sidebar-accent-foreground": "oklch(0.85 0.04 264)",
      "--sidebar-border":       "oklch(0.3 0 0)",
      "--sidebar-ring":         "oklch(0.635 0.22 264)",
      "--brand":                "oklch(0.635 0.22 264)",
      "--brand-muted":          "oklch(0.25 0.06 264)",
    },
  },

  // ── Emerald ─────────────────────────────────────────────────────────────────
  emerald: {
    light: {
      ...structuralLight,
      "--primary":              "oklch(0.53 0.195 151)",       // rich emerald
      "--primary-foreground":   "oklch(0.985 0 0)",
      "--accent":               "oklch(0.93 0.05 151)",
      "--accent-foreground":    "oklch(0.2 0.06 151)",
      "--ring":                 "oklch(0.53 0.195 151)",
      "--sidebar":              "oklch(0.985 0 0)",
      "--sidebar-foreground":   "oklch(0.145 0 0)",
      "--sidebar-primary":      "oklch(0.53 0.195 151)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent":       "oklch(0.93 0.05 151)",
      "--sidebar-accent-foreground": "oklch(0.2 0.06 151)",
      "--sidebar-border":       "oklch(0.922 0 0)",
      "--sidebar-ring":         "oklch(0.53 0.195 151)",
      "--brand":                "oklch(0.53 0.195 151)",
      "--brand-muted":          "oklch(0.93 0.06 151)",
    },
    dark: {
      ...structuralDark,
      "--primary":              "oklch(0.62 0.18 151)",
      "--primary-foreground":   "oklch(0.1 0 0)",
      "--accent":               "oklch(0.24 0.055 151)",
      "--accent-foreground":    "oklch(0.85 0.04 151)",
      "--ring":                 "oklch(0.62 0.18 151)",
      "--sidebar":              "oklch(0.18 0 0)",
      "--sidebar-foreground":   "oklch(0.985 0 0)",
      "--sidebar-primary":      "oklch(0.62 0.18 151)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent":       "oklch(0.24 0.055 151)",
      "--sidebar-accent-foreground": "oklch(0.85 0.04 151)",
      "--sidebar-border":       "oklch(0.3 0 0)",
      "--sidebar-ring":         "oklch(0.62 0.18 151)",
      "--brand":                "oklch(0.62 0.18 151)",
      "--brand-muted":          "oklch(0.24 0.055 151)",
    },
  },

  // ── Violet ──────────────────────────────────────────────────────────────────
  violet: {
    light: {
      ...structuralLight,
      "--primary":              "oklch(0.54 0.25 295)",        // vivid violet
      "--primary-foreground":   "oklch(0.985 0 0)",
      "--accent":               "oklch(0.94 0.05 295)",
      "--accent-foreground":    "oklch(0.2 0.06 295)",
      "--ring":                 "oklch(0.54 0.25 295)",
      "--sidebar":              "oklch(0.985 0 0)",
      "--sidebar-foreground":   "oklch(0.145 0 0)",
      "--sidebar-primary":      "oklch(0.54 0.25 295)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent":       "oklch(0.94 0.05 295)",
      "--sidebar-accent-foreground": "oklch(0.2 0.06 295)",
      "--sidebar-border":       "oklch(0.922 0 0)",
      "--sidebar-ring":         "oklch(0.54 0.25 295)",
      "--brand":                "oklch(0.54 0.25 295)",
      "--brand-muted":          "oklch(0.94 0.06 295)",
    },
    dark: {
      ...structuralDark,
      "--primary":              "oklch(0.63 0.22 295)",
      "--primary-foreground":   "oklch(0.1 0 0)",
      "--accent":               "oklch(0.25 0.06 295)",
      "--accent-foreground":    "oklch(0.85 0.04 295)",
      "--ring":                 "oklch(0.63 0.22 295)",
      "--sidebar":              "oklch(0.18 0 0)",
      "--sidebar-foreground":   "oklch(0.985 0 0)",
      "--sidebar-primary":      "oklch(0.63 0.22 295)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent":       "oklch(0.25 0.06 295)",
      "--sidebar-accent-foreground": "oklch(0.85 0.04 295)",
      "--sidebar-border":       "oklch(0.3 0 0)",
      "--sidebar-ring":         "oklch(0.63 0.22 295)",
      "--brand":                "oklch(0.63 0.22 295)",
      "--brand-muted":          "oklch(0.25 0.06 295)",
    },
  },

  // ── Rose ────────────────────────────────────────────────────────────────────
  rose: {
    light: {
      ...structuralLight,
      "--primary":              "oklch(0.56 0.23 10)",         // vivid rose/red
      "--primary-foreground":   "oklch(0.985 0 0)",
      "--accent":               "oklch(0.94 0.05 10)",
      "--accent-foreground":    "oklch(0.2 0.06 10)",
      "--ring":                 "oklch(0.56 0.23 10)",
      "--sidebar":              "oklch(0.985 0 0)",
      "--sidebar-foreground":   "oklch(0.145 0 0)",
      "--sidebar-primary":      "oklch(0.56 0.23 10)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent":       "oklch(0.94 0.05 10)",
      "--sidebar-accent-foreground": "oklch(0.2 0.06 10)",
      "--sidebar-border":       "oklch(0.922 0 0)",
      "--sidebar-ring":         "oklch(0.56 0.23 10)",
      "--brand":                "oklch(0.56 0.23 10)",
      "--brand-muted":          "oklch(0.94 0.06 10)",
    },
    dark: {
      ...structuralDark,
      "--primary":              "oklch(0.65 0.21 10)",
      "--primary-foreground":   "oklch(0.1 0 0)",
      "--accent":               "oklch(0.25 0.06 10)",
      "--accent-foreground":    "oklch(0.85 0.04 10)",
      "--ring":                 "oklch(0.65 0.21 10)",
      "--sidebar":              "oklch(0.18 0 0)",
      "--sidebar-foreground":   "oklch(0.985 0 0)",
      "--sidebar-primary":      "oklch(0.65 0.21 10)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent":       "oklch(0.25 0.06 10)",
      "--sidebar-accent-foreground": "oklch(0.85 0.04 10)",
      "--sidebar-border":       "oklch(0.3 0 0)",
      "--sidebar-ring":         "oklch(0.65 0.21 10)",
      "--brand":                "oklch(0.65 0.21 10)",
      "--brand-muted":          "oklch(0.25 0.06 10)",
    },
  },
};
