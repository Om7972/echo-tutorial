"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface InboxScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
  messages: any[];
}

export function InboxScreen({ currentTheme, messages }: InboxScreenProps) {
  const { pop, push } = useWidgetRouter();

  const mockConversations = [
    {
      id: "active",
      title: "Current Support Session",
      desc: messages.length > 0 ? messages[messages.length - 1].text : "No messages yet",
      time: messages.length > 0 ? messages[messages.length - 1].time : "Just now",
      status: "active",
      count: messages.length,
    },
    {
      id: "prev-1",
      title: "Vapi Voice Configuration Inquiry",
      desc: "Resolved: Added public keys to variables.",
      time: "Yesterday",
      status: "resolved",
      count: 6,
    },
    {
      id: "prev-2",
      title: "Billing Details & Invoice",
      desc: "Resolved: Downgraded workspace from Scale to Startup tier.",
      time: "June 18",
      status: "resolved",
      count: 4,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
        <button
          onClick={pop}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Conversations
        </h3>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockConversations.map((conv, i) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              if (conv.id === "active") {
                push("chat");
              }
            }}
            className="w-full p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 flex flex-col text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex justify-between items-start w-full gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {conv.title}
              </span>
              <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {conv.time}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 truncate mt-1.5 w-full leading-relaxed">
              {conv.desc}
            </p>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  conv.status === "active"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {conv.status}
              </span>

              <span className="text-[9px] text-slate-400 font-semibold">
                {conv.count} messages
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
