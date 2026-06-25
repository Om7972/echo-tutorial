// @ts-nocheck
"use client";

// ─── ThemePanel ───────────────────────────────────────────────────────────────
//
// Floating panel anchored to the bottom-right corner of the screen.
// Renders the full mode toggle + color picker in an expandable popover.
// Used across Dashboard, Widget, Chat, and Landing surfaces.

import { useState } from "react";
import { Palette, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ColorPicker } from "./color-picker";
import { useTheme } from "./theme-provider";
import { COLOR_LABELS } from "@/lib/theme/types";

export function ThemePanel() {
  const [open, setOpen] = useState(false);
  const { color, resolvedMode } = useTheme();

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Panel popover */}
        <div
          className={`
            bg-popover border border-border rounded-2xl shadow-2xl shadow-black/20
            overflow-hidden transition-all duration-300 origin-bottom-right
            ${open
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-90 translate-y-4 pointer-events-none"
            }
          `}
          style={{ width: "260px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Appearance</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode section */}
          <div className="px-4 py-3 space-y-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Mode
            </p>
            <ThemeToggle />
          </div>

          {/* Accent color section */}
          <div className="px-4 py-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Accent Color
            </p>
            <div className="space-y-2">
              {/* 2×2 grid of colors with labels */}
              <div className="grid grid-cols-2 gap-2">
                {(["blue", "emerald", "violet", "rose"] as const).map((c) => {
                  const preview: Record<string, string> = {
                    blue:    "oklch(0.546 0.245 264)",
                    emerald: "oklch(0.53  0.195 151)",
                    violet:  "oklch(0.54  0.25  295)",
                    rose:    "oklch(0.56  0.23  10)",
                  };
                  const isActive = color === c;
                  return (
                    <ColorSwatch
                      key={c}
                      colorId={c}
                      label={COLOR_LABELS[c]}
                      previewColor={preview[c]!}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live preview indicator */}
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {resolvedMode === "dark" ? "Dark" : "Light"} · {COLOR_LABELS[color]}
            </span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-wide">Live</span>
          </div>
        </div>

        {/* Trigger button */}
        <button
          id="theme-panel-trigger"
          onClick={() => setOpen(!open)}
          aria-label="Open theme settings"
          className={`
            w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center
            transition-all duration-300
            bg-primary text-primary-foreground
            hover:shadow-xl hover:scale-105 active:scale-95
            ${open ? "rotate-12" : "rotate-0"}
          `}
        >
          <Palette className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}

// ── Internal swatch with label ──────────────────────────────────────────────

function ColorSwatch({
  colorId,
  label,
  previewColor,
  isActive,
}: {
  colorId: string;
  label: string;
  previewColor: string;
  isActive: boolean;
}) {
  const { setColor } = useTheme();

  return (
    <button
      id={`theme-panel-color-${colorId}`}
      onClick={() => setColor(colorId as any)}
      aria-pressed={isActive}
      className={`
        flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
        border transition-all duration-200
        ${isActive
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground"
        }
      `}
    >
      <span
        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
        style={{ backgroundColor: previewColor }}
      />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
