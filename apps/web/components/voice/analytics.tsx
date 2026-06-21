"use client";

/**
 * VoiceAnalytics Component
 *
 * Renders statistical cards and dashboards indicating call count, completed,
 * average durations, and provider metrics/ratios.
 */

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Phone, CheckCircle, Flame, Clock, BarChart3 } from "lucide-react";

interface VoiceAnalyticsProps {
  userId: string;
}

export function VoiceAnalytics({ userId }: VoiceAnalyticsProps) {
  const analytics = useQuery(api.voice_sessions.getAnalytics, { userId });

  if (analytics === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-28 rounded-2xl bg-slate-900/40 border border-white/5" />
        ))}
      </div>
    );
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return "0s";
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const providerCounts = analytics.byProvider || {};
  const providers = Object.entries(providerCounts);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Calls */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Calls</span>
            <div className="text-2xl font-bold text-slate-100">{analytics.totalSessions}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Completed</span>
            <div className="text-2xl font-bold text-emerald-400">{analytics.completedCalls}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Failed / Errors</span>
            <div className="text-2xl font-bold text-rose-400">{analytics.failedCalls}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Average Duration */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Avg Duration</span>
            <div className="text-2xl font-bold text-amber-400">
              {formatDuration(analytics.averageDurationMs)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Breakdown Card */}
      <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">Provider Usage Ratio</h3>
        </div>

        {providers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No model metrics available yet.</p>
        ) : (
          <div className="space-y-3.5">
            {providers.map(([providerName, count]) => {
              const numCount = count as number;
              const percentage = Math.round((numCount / analytics.totalSessions) * 100);
              const color =
                providerName === "openai"
                  ? "bg-emerald-500"
                  : providerName === "anthropic"
                  ? "bg-orange-500"
                  : "bg-purple-500";

              return (
                <div key={providerName} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="capitalize text-slate-300">{providerName}</span>
                    <span className="text-slate-400">
                      {numCount} call{numCount !== 1 ? "s" : ""} ({percentage}%)
                    </span>
                  </div>
                  {/* Progress bar wrapper */}
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
