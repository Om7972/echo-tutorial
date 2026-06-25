// @ts-nocheck
"use client";

/**
 * CallHistory Component
 *
 * Displays a list of recent calls, details, status, duration, and expandable
 * transcripts of conversation utterances.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { MessageSquare, PhoneCall, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface CallHistoryProps {
  userId: string;
}

export function CallHistory({ userId }: CallHistoryProps) {
  const sessions = useQuery(api.voice_sessions.listSessionsByUser, { userId });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  if (sessions === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <p className="text-sm text-slate-400">Loading call history...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-slate-900/20">
        <PhoneCall className="w-12 h-12 text-slate-500 mb-3 stroke-[1.5]" />
        <h3 className="text-base font-semibold text-slate-300">No calls found</h3>
        <p className="text-xs text-slate-400 max-w-[280px] mt-1">
          Your call logs and conversation transcripts will appear here once you place a call.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {sessions.map((session: any) => (
        <CallHistoryItem
          key={session._id}
          session={session}
          isExpanded={expandedSessionId === session._id}
          onToggle={() =>
            setExpandedSessionId(expandedSessionId === session._id ? null : session._id)
          }
        />
      ))}
    </div>
  );
}

function CallHistoryItem({
  session,
  isExpanded,
  onToggle,
}: {
  session: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const formatDuration = (ms?: number) => {
    if (!ms) return "0s";
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "openai":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "anthropic":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "grok":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-white/10">
      {/* Header Summary */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl ${
              session.status === "ended"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            <PhoneCall className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">
                Call {session.status === "ended" ? "Completed" : "Failed"}
              </span>
              <span
                className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${getProviderColor(
                  session.provider
                )}`}
              >
                {session.provider}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(session._creationTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(session.durationMs)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session.reconnectCount > 0 && (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              {session.reconnectCount} reconnected
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Transcript details */}
      {isExpanded && <TranscriptDetails sessionId={session._id} />}
    </div>
  );
}

function TranscriptDetails({ sessionId }: { sessionId: Id<"voice_sessions"> }) {
  const messages = useQuery(api.voice_messages.getSessionMessages, { sessionId });

  if (messages === undefined) {
    return (
      <div className="border-t border-white/5 bg-slate-950/20 px-6 py-4 flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400">Loading transcript...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="border-t border-white/5 bg-slate-950/20 px-6 py-4 text-center">
        <MessageSquare className="w-5 h-5 text-slate-500 mx-auto mb-1" />
        <span className="text-xs text-slate-400">No transcript available for this call.</span>
      </div>
    );
  }

  return (
    <div className="border-t border-white/5 bg-slate-950/30 px-6 py-4 space-y-3 max-h-[300px] overflow-y-auto">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Transcript</h4>
      {messages.map((msg: any) => (
        <div
          key={msg._id}
          className={`flex gap-3 text-xs leading-relaxed max-w-[85%] ${
            msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
          }`}
        >
          {/* Avatar */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200 border border-white/5"
            }`}
          >
            {msg.role === "user" ? "U" : "AI"}
          </div>

          {/* Bubble */}
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
      ))}
    </div>
  );
}
