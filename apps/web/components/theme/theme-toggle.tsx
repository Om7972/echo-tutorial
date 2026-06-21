"use client";

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
//
// Animated three-way mode switcher: Light / System / Dark.
// Uses a sliding pill indicator with smooth CSS transitions.

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import type { ThemeMode } from "@/lib/theme/types";

const MODES: { id: ThemeMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "light",  icon: Sun,     label: "Light"  },
  { id: "system", icon: Monitor, label: "System" },
  { id: "dark",   icon: Moon,    label: "Dark"   },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();

  if (compact) {
    // Single icon button that cycles through modes
    const next: Record<ThemeMode, ThemeMode> = {
      light: "dark", dark: "system", system: "light",
    };
    const currentMode = MODES.find((m) => m.id === mode) ?? MODES[1]!;
    const Icon = currentMode.icon;

    return (
      <button
        id="theme-toggle-compact"
        onClick={() => setMode(next[mode])}
        title={`Mode: ${currentMode.label} (click to cycle)`}
        className="relative w-9 h-9 rounded-xl border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <Icon className="w-4 h-4 transition-all duration-300" />
      </button>
    );
  }

  return (
    <div
      id="theme-toggle-group"
      role="group"
      aria-label="Theme mode"
      className="relative flex items-center gap-0.5 p-1 rounded-xl bg-muted border border-border"
    >
      {/* Sliding pill indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm border border-border transition-all duration-300 ease-in-out"
        style={{
          left: `calc(${MODES.findIndex((m) => m.id === mode)} * (100% / 3) + 4px)`,
          width: "calc(100% / 3 - 8px)",
        }}
      />

      {MODES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          id={`theme-mode-${id}`}
          onClick={() => setMode(id)}
          title={label}
          aria-pressed={mode === id}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 ${
            mode === id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
