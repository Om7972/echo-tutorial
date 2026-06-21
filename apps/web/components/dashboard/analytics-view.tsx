"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { 
  Phone, CheckCircle, Clock, BarChart3, TrendingUp, Sparkles, 
  Download, Calendar, Database, ShieldAlert, Cpu, Heart, RefreshCw, AlertCircle
} from "lucide-react"
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"

// Format helper
function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${Math.round(secs)}s`;
  const mins = secs / 60;
  if (mins < 60) return `${Math.floor(mins)}m ${Math.round(secs % 60)}s`;
  const hours = mins / 60;
  return `${Math.floor(hours)}h ${Math.round(mins % 60)}m`;
}

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs font-bold text-slate-200 mb-1.5">{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} className="text-[10px] font-semibold flex items-center gap-2 mt-1" style={{ color: item.color || item.fill }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-slate-400">{item.name}:</span>
            <span className="text-slate-100 font-bold ml-auto">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-white/5 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-850 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-900/40 border border-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[320px] bg-slate-900/40 border border-white/5 rounded-2xl" />
        <div className="h-[320px] bg-slate-900/40 border border-white/5 rounded-2xl" />
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const [mounted, setMounted] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  // Resolve dates based on selected filter
  const getDates = () => {
    const now = Date.now();
    if (dateRange === "7d") {
      return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
    }
    if (dateRange === "90d") {
      return { start: now - 90 * 24 * 60 * 60 * 1000, end: now };
    }
    if (dateRange === "custom" && customRange.start && customRange.end) {
      return { 
        start: new Date(customRange.start).getTime(), 
        end: new Date(customRange.end).getTime() 
      };
    }
    // Default 30 days
    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
  };

  const dates = getDates();

  // Convex Query fetching calculated backend analytics
  const data = useQuery(api.analytics.getAnalyticsData, {
    orgId: selectedWorkspace,
    startDate: dates.start,
    endDate: dates.end,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !data) {
    return <AnalyticsSkeleton />;
  }

  const { metrics, chartData, workspaces } = data;

  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    
    const headers = ["Date", "Total Volume", "AI Handled", "Human Handoff", "Tokens Used", "Cost (USD)", "CSAT Rating"];
    const rows = chartData.map((d: any) => [
      d.date,
      d.volume,
      d.aiResolved,
      d.humanHandoff,
      d.tokens,
      d.cost,
      d.csat
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `echo_analytics_${selectedWorkspace}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pie chart data
  const pieData = [
    { name: "AI Resolved", value: Math.round(metrics.aiResolutionPercent), color: "#10b981" },
    { name: "Human Handoff", value: Math.round(metrics.humanHandoffPercent), color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Performance & Insights
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Realtime SLA compliance, LLM usage metrics, satisfaction, and workspace routing tracking.
          </p>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Workspace Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/5 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workspace:</span>
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="text-xs font-bold text-slate-200 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-slate-200">All Workspaces</option>
              {workspaces.map((w: string) => (
                <option key={w} value={w} className="bg-slate-950 text-slate-200">{w}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/5 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-bold text-slate-200 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="7d" className="bg-slate-950 text-slate-200">Last 7 Days</option>
              <option value="30d" className="bg-slate-950 text-slate-200">Last 30 Days</option>
              <option value="90d" className="bg-slate-950 text-slate-200">Last 90 Days</option>
              <option value="custom" className="bg-slate-950 text-slate-200">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/5 px-2 py-1 rounded-xl">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                className="text-[10px] text-slate-200 bg-transparent border-none outline-none focus:ring-0"
              />
              <span className="text-[10px] text-slate-500">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                className="text-[10px] text-slate-200 bg-transparent border-none outline-none focus:ring-0"
              />
            </div>
          )}

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Volume</span>
            <div className="text-xl font-extrabold text-slate-100">{metrics.conversationVolume}</div>
            <p className="text-[9px] text-slate-400">Total chat sessions initiated</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Phone className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* First Response Time */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">First Response Time</span>
            <div className="text-xl font-extrabold text-slate-100">{formatDuration(metrics.firstResponseTimeMs)}</div>
            <p className="text-[9px] text-slate-400">Avg delay before human/AI reply</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Average Resolution Time */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Resolution Time</span>
            <div className="text-xl font-extrabold text-slate-100">{formatDuration(metrics.resolutionTimeMs)}</div>
            <p className="text-[9px] text-slate-400">Avg time from open to resolved</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <CheckCircle className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* CSAT Rating */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Customer Satisfaction</span>
            <div className="text-xl font-extrabold text-amber-400 flex items-center gap-1">
              {metrics.csatScore.toFixed(2)}
              <span className="text-[10px] text-slate-500 font-semibold">/ 5.0</span>
            </div>
            <p className="text-[9px] text-slate-400">Average customer feedback score</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* AI Resolution % */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">AI Resolution %</span>
            <div className="text-xl font-extrabold text-emerald-400">{metrics.aiResolutionPercent.toFixed(1)}%</div>
            <p className="text-[9px] text-slate-400">Tickets closed purely by AI</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Cpu className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Human Handoff % */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Human Handoff %</span>
            <div className="text-xl font-extrabold text-rose-400">{metrics.humanHandoffPercent.toFixed(1)}%</div>
            <p className="text-[9px] text-slate-400">Escalated to human operator queue</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Token Usage */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">LLM Token Usage</span>
            <div className="text-xl font-extrabold text-blue-400">{metrics.tokenUsage.toLocaleString()}</div>
            <p className="text-[9px] text-slate-400">Total prompts & completion tokens</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Database className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Total Cost */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between hover:border-white/10 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Estimated Cost</span>
            <div className="text-xl font-extrabold text-emerald-450">${metrics.costUSD.toFixed(3)}</div>
            <p className="text-[9px] text-slate-400">Aggregated LLM execution costs</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Charts Visualization Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat Volume Over Time (Stacked Area Chart) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs uppercase font-black tracking-wider text-slate-350">Conversation Volume Trends</h3>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded">AI vs Human</span>
          </div>

          <div className="h-[260px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHuman" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Area type="monotone" name="AI Resolved" dataKey="aiResolved" stroke="#10b981" fillOpacity={1} fill="url(#colorAI)" strokeWidth={1.5} />
                <Area type="monotone" name="Human Handoff" dataKey="humanHandoff" stroke="#ef4444" fillOpacity={1} fill="url(#colorHuman)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: AI Handoff Share (Donut Pie Chart) */}
        <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Cpu className="w-4 h-4 text-emerald-450" />
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-350">Resolution Share</h3>
          </div>

          <div className="h-[180px] w-full relative flex items-center justify-center mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-100">{metrics.aiResolutionPercent.toFixed(0)}%</span>
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">AI Autopilot</span>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-300">{d.name}</span>
                </div>
                <span className="text-slate-100">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Cost Over Time (Bar and Line Mix) */}
        <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-450" />
              <h3 className="text-xs uppercase font-black tracking-wider text-slate-350">LLM Tokens & Costs</h3>
            </div>
            <span className="text-[9px] text-slate-500 font-bold">DAILY SPEND</span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="left" name="Tokens" dataKey="tokens" fill="#3b82f6" opacity={0.65} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" name="Cost (USD)" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} activeDot={{ r: 4 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CSAT Trend (Line Chart) */}
        <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <h3 className="text-xs uppercase font-black tracking-wider text-slate-350">CSAT Score Trend</h3>
            </div>
            <span className="text-[9px] text-amber-500 font-bold flex items-center gap-0.5">
              ★ {metrics.csatScore.toFixed(2)} Avg
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis domain={[3, 5]} ticks={[3.0, 3.5, 4.0, 4.5, 5.0]} stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line name="CSAT Rating" type="monotone" dataKey="csat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
