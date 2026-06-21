"use client";

/**
 * Voice Assistant Hub Dashboard Page
 *
 * Comprehensive developer control dashboard containing tabs for:
 * 1. AI Voice Assistant (Interactive call UI, mic, waveform, transcripts)
 * 2. Analytics (Average durations, status counts, provider shares)
 * 3. Call History & Logs (UTT logs and session history logs)
 */

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { AssistantInterface } from "@/components/voice/assistant-interface";
import { VoiceAnalytics } from "@/components/voice/analytics";
import { CallHistory } from "@/components/voice/call-history";
import { Sparkles, BarChart2, History, Bot } from "lucide-react";

type DashboardTab = "assistant" | "analytics" | "history";

export default function Page() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<DashboardTab>("assistant");

  // Safeguard if user is not loaded yet
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh bg-[#030712] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
        <p className="text-sm">Retrieving developer account details...</p>
      </div>
    );
  }

  const userId = user.id;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      {/* ─── Header Navigation ─── */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl w-full mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Echo Voice</h1>
              <span className="text-[10px] text-slate-500 font-medium">AI Agent Orchestration Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              Developer: <span className="text-slate-200">{user.fullName || user.username}</span>
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* ─── Main Contents ─── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Dashboard Tabs Selectors */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex bg-slate-950/60 border border-white/5 p-1 rounded-xl">
            <button
              id="tab-assistant-btn"
              onClick={() => setActiveTab("assistant")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "assistant"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Live Assistant
            </button>
            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Analytics
            </button>
            <button
              id="tab-history-btn"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Call History
            </button>
          </div>
        </div>

        {/* Tab Render Switch */}
        <div className="transition-all duration-300">
          {activeTab === "assistant" && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              <AssistantInterface userId={userId} />
            </div>
          )}
          {activeTab === "analytics" && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              <VoiceAnalytics userId={userId} />
            </div>
          )}
          {activeTab === "history" && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              <CallHistory userId={userId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
