// @ts-nocheck
"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  BookOpen,
  Mic,
  UserCheck,
  ChevronRight,
  Inbox,
  ArrowLeft,
} from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface HomeScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
  logoUrl?: string;
  orgId: string;
}

export function HomeScreen({ currentTheme, logoUrl, orgId }: HomeScreenProps) {
  const { push } = useWidgetRouter();

  const options = [
    {
      id: "chat",
      title: "Send us a message",
      desc: "Our AI assistant usually replies instantly",
      icon: MessageSquare,
      color: "text-blue-500 bg-blue-500/10",
      target: "chat" as const,
    },
    {
      id: "inbox",
      title: "View call & chat history",
      desc: "Track your previous support interactions",
      icon: Inbox,
      color: "text-purple-500 bg-purple-500/10",
      target: "inbox" as const,
    },
    {
      id: "kb",
      title: "Search help articles",
      desc: "Find answers in our docs and guides",
      icon: BookOpen,
      color: "text-emerald-500 bg-emerald-500/10",
      target: "kb" as const,
    },
    {
      id: "voice",
      title: "Start voice assistance",
      desc: "Interact with our real-time voice agent",
      icon: Mic,
      color: "text-rose-500 bg-rose-500/10",
      target: "voice" as const,
    },
    {
      id: "handoff",
      title: "Talk to a human",
      desc: "Connect with a live agent representative",
      icon: UserCheck,
      color: "text-amber-500 bg-amber-500/10",
      target: "handoff" as const,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Welcome Banner */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center font-bold text-lg mb-3.5 border border-slate-200/50 dark:border-slate-700/50">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full rounded-2xl object-contain" />
          ) : (
            "E"
          )}
        </div>
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white capitalize">
          Hello! How can we help?
        </h2>
        <p className="text-[11px] text-slate-400 mt-1">
          Ask our AI agents, read guides, or request human support for {orgId}.
        </p>
      </div>

      {/* Navigation Options list */}
      <div className="flex-1 p-4 space-y-2.5">
        {options.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => push(opt.target)}
              className="w-full p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${opt.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                    {opt.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{opt.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
