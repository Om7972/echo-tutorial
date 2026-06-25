// @ts-nocheck
"use client";

// ─── ColorPicker ──────────────────────────────────────────────────────────────
//
// Palette swatches for the 4 accent colors.
// Each swatch renders the actual OKLCH primary color so users see exactly
// what the theme will look like.

import { Check } from "lucide-react";
import { useTheme } from "./theme-provider";
import type { ThemeColor } from "@/lib/theme/types";
import { COLOR_LABELS } from "@/lib/theme/types";

// Preview colors: roughly what the primary will look like on screen.
const COLOR_PREVIEW: Record<ThemeColor, string> = {
  blue:    "oklch(0.546 0.245 264)",
  emerald: "oklch(0.53  0.195 151)",
  violet:  "oklch(0.54  0.25  295)",
  rose:    "oklch(0.56  0.23  10)",
};

const COLORS: ThemeColor[] = ["blue", "emerald", "violet", "rose"];

export function ColorPicker({ showLabels = false }: { showLabels?: boolean }) {
  const { color, setColor } = useTheme();

  return (
    <div
      id="theme-color-picker"
      role="group"
      aria-label="Accent color"
      className={`flex items-center gap-2 ${showLabels ? "flex-col" : "flex-row"}`}
    >
      {COLORS.map((c) => {
        const isActive = color === c;
        return (
          <button
            key={c}
            id={`theme-color-${c}`}
            onClick={() => setColor(c)}
            title={COLOR_LABELS[c]}
            aria-pressed={isActive}
            className="group relative flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {/* Swatch circle */}
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200 shadow-sm"
              style={{
                backgroundColor: COLOR_PREVIEW[c],
                borderColor: isActive ? COLOR_PREVIEW[c] : "transparent",
                boxShadow: isActive ? `0 0 0 3px ${COLOR_PREVIEW[c]}33` : "none",
              }}
            >
              {isActive && (
                <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" strokeWidth={3} />
              )}
            </span>

            {/* Optional label */}
            {showLabels && (
              <span
                className={`text-xs font-semibold transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {COLOR_LABELS[c]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
