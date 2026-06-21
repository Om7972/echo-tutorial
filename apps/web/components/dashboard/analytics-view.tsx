"use client"

import { Phone, CheckCircle, Flame, Clock, BarChart3, TrendingUp, Sparkles } from "lucide-react"

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-xs text-slate-400">Track LLM latency, queue rates, call statistics, and connection logs</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Global Call Sessions</span>
            <div className="text-2xl font-bold text-slate-100">12,480</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">STT Accuracy</span>
            <div className="text-2xl font-bold text-emerald-400">98.4%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average LLM Latency</span>
            <div className="text-2xl font-bold text-indigo-400">320ms</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Queue Size</span>
            <div className="text-2xl font-bold text-amber-400">12</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Graph Mock Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">Call Count Over Time</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">Last 30 Days</span>
          </div>

          {/* Simple custom Bar Chart Visualizer using pure Tailwind */}
          <div className="h-[200px] flex items-end justify-between gap-2.5 pt-4">
            {[45, 60, 50, 75, 90, 80, 110, 95, 120, 130, 115, 140].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 shadow-md shadow-blue-500/10 transition-all duration-300 hover:brightness-110"
                  style={{ height: `${h}px` }}
                />
                <span className="text-[9px] text-slate-600 font-bold uppercase">M{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Shares */}
        <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">LLM Provider Share</h3>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { name: "OpenAI GPT Models", ratio: 65, color: "bg-emerald-500", raw: 8112 },
              { name: "Anthropic Claude Models", ratio: 25, color: "bg-orange-500", raw: 3120 },
              { name: "xAI Grok Models", ratio: 10, color: "bg-purple-500", raw: 1248 },
            ].map((m) => (
              <div key={m.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{m.name}</span>
                  <span className="text-slate-400">
                    {m.raw} ({m.ratio}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.ratio}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
