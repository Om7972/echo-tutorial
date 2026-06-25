// @ts-nocheck
"use client";

/**
 * Waveform Visualizer
 *
 * Renders a responsive, smooth, multi-layered waveform visualizer that expands
 * and contracts dynamically based on real-time voice volume.
 */

import { useEffect, useState, useRef } from "react";

interface WaveformProps {
  volume: number;     // value between 0 and 1
  isActive: boolean;  // if call is active
  color?: string;     // primary color hex
}

export function Waveform({ volume, isActive, color = "#3b82f6" }: WaveformProps) {
  const [bars, setBars] = useState<number[]>(new Array(18).fill(4));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setBars(new Array(18).fill(4));
      return;
    }

    const updateWaveform = () => {
      setBars((prev) =>
        prev.map(() => {
          // Add some organic noise/fluctuation around the current volume level
          const base = volume * 45; // scale volume to max height
          const noise = Math.random() * 8 - 4;
          const height = Math.max(4, Math.min(50, base + noise));
          return height;
        })
      );
      animationRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volume, isActive]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-[240px] px-4 py-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full transition-all duration-75"
          style={{
            height: `${height}px`,
            backgroundColor: isActive ? color : "rgba(255, 255, 255, 0.12)",
            boxShadow: isActive
              ? `0 0 10px ${color}55, inset 0 1px 0 rgba(255,255,255,0.2)`
              : "none",
            opacity: isActive ? 0.4 + (height / 50) * 0.6 : 0.4,
          }}
        />
      ))}
    </div>
  );
}
