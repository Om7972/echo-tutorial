"use client";

/**
 * AssistantInterface Component
 *
 * Implements the live voice conversation screen.
 * Shows microphone state animations, provider configuration, mute/hangup controls,
 * reconnection prompts, and real-time transcripts.
 */

import { useState } from "react";
import { useVapi, AssistantProvider } from "@/hooks/use-vapi";
import { Waveform } from "./waveform";
import {
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Sparkles,
  User,
  Bot,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface AssistantInterfaceProps {
  userId: string;
}

export function AssistantInterface({ userId }: AssistantInterfaceProps) {
  const {
    status,
    volume,
    isMuted,
    transcript,
    error,
    provider,
    startCall,
    endCall,
    toggleMute,
    reconnectCall,
  } = useVapi(userId);

  const [selectedProvider, setSelectedProvider] = useState<AssistantProvider>("openai");

  // Determine state labels and glow classes
  const getStatusDisplay = () => {
    switch (status) {
      case "connecting":
        return { label: "Establishing connection...", color: "text-amber-400", glow: "animate-pulse shadow-amber-500/20" };
      case "listening":
        return { label: "Listening to you...", color: "text-emerald-400", glow: "shadow-emerald-500/20" };
      case "speaking":
        return { label: "Speaking...", color: "text-blue-400", glow: "shadow-blue-500/30 scale-105" };
      case "processing":
        return { label: "Thinking...", color: "text-indigo-400", glow: "animate-bounce shadow-indigo-500/25" };
      default:
        return { label: "Voice Assistant Idle", color: "text-slate-400", glow: "shadow-slate-500/10" };
    }
  };

  const statusInfo = getStatusDisplay();
  const isActive = status !== "idle";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Controls & Mic Visualizer (Left Column) */}
      <div className="lg:col-span-2 flex flex-col items-center justify-between p-6 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md min-h-[460px]">
        {/* Model Selection (Hidden when call is active to prevent switching mid-call) */}
        {!isActive ? (
          <div className="w-full space-y-2.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Select AI Brain
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["openai", "anthropic", "grok"] as AssistantProvider[]).map((prov) => (
                <button
                  key={prov}
                  id={`voice-provider-btn-${prov}`}
                  onClick={() => setSelectedProvider(prov)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-200 capitalize ${
                    selectedProvider === prov
                      ? "bg-blue-600/15 border-blue-500 text-blue-400 shadow-md shadow-blue-500/5"
                      : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300"
                  }`}
                >
                  {prov === "grok" ? "Grok" : prov}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/40 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Brain</span>
            <span className="text-xs font-semibold text-blue-400 capitalize">{provider}</span>
          </div>
        )}

        {/* Center Mic Visualizer */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div
            className={`relative flex items-center justify-center w-24 h-24 rounded-full border border-white/10 bg-slate-900 transition-all duration-300 shadow-2xl ${statusInfo.glow}`}
          >
            {/* Animated mic background pulse when speaking/listening */}
            {status === "speaking" && (
              <span className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            )}
            {status === "listening" && (
              <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
            )}

            {isMuted ? (
              <MicOff className="w-9 h-9 text-rose-500 stroke-[1.5]" />
            ) : (
              <Mic
                className={`w-9 h-9 stroke-[1.5] transition-colors duration-300 ${
                  status === "listening"
                    ? "text-emerald-400"
                    : status === "speaking"
                    ? "text-blue-400"
                    : "text-slate-400"
                }`}
              />
            )}
          </div>

          <div className="text-center space-y-1">
            <div className={`text-sm font-semibold tracking-wide ${statusInfo.color}`}>
              {statusInfo.label}
            </div>
            <p className="text-[10px] text-slate-500">
              {status === "idle"
                ? "Click start below to speak with AI"
                : status === "connecting"
                ? "Checking microphone & network..."
                : "Continuous low-latency voice pipeline"}
            </p>
          </div>
        </div>

        {/* Waveform Visualization */}
        <Waveform
          volume={volume}
          isActive={status === "speaking" || status === "listening" || status === "processing"}
          color={status === "speaking" ? "#3b82f6" : "#10b981"}
        />

        {/* Control Actions Row */}
        <div className="w-full flex justify-center gap-3 mt-6">
          {!isActive ? (
            <button
              id="voice-start-btn"
              onClick={() => startCall(selectedProvider)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              Start Voice Call
            </button>
          ) : (
            <>
              {/* Mute Button */}
              <button
                id="voice-mute-btn"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  isMuted
                    ? "bg-rose-500/15 border-rose-500 text-rose-400"
                    : "bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300"
                }`}
              >
                {isMuted ? (
                  <>
                    <Mic className="w-4 h-4" /> Unmute
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4" /> Mute
                  </>
                )}
              </button>

              {/* Reconnect Button */}
              {status === "connecting" && (
                <button
                  id="voice-reconnect-btn"
                  onClick={reconnectCall}
                  title="Reconnect Session"
                  className="flex items-center justify-center w-10 h-10 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Hangup Button */}
              <button
                id="voice-hangup-btn"
                onClick={endCall}
                title="Hang up call"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-rose-500/10"
              >
                <PhoneOff className="w-4 h-4" /> Hang Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Transcripts View (Right Column) */}
      <div className="lg:col-span-3 flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md min-h-[460px]">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Bot className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">Live Transcript</h3>
        </div>

        {/* Conversation flow container */}
        <div className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-1 max-h-[300px]">
          {transcript.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-10">
              <HelpCircle className="w-8 h-8 stroke-[1.2]" />
              <p className="text-xs">No transcripts recorded yet.</p>
              <p className="text-[10px] text-slate-600 max-w-[200px]">
                Utterances will appear dynamically as you speak to the assistant.
              </p>
            </div>
          ) : (
            transcript.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-xs leading-relaxed max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-200 border border-white/5"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Text Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600/10 border border-blue-500/20 text-slate-200 rounded-tr-none"
                      : "bg-slate-900/60 border border-white/5 text-slate-300 rounded-tl-none"
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Connection Error</span>
              <span className="text-[11px] opacity-90">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
