"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  ExternalLink,
  ChevronUp,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "assistant",
    text: "Hi there! 👋 Welcome to Echo support. Ask us anything about integration, billing, or custom agents.",
    time: "Just now",
  },
];

const QUICK_REPLIES = [
  "How do I set up Vapi voice?",
  "What models are supported?",
  "What is the average response latency?",
];

function WidgetEmbedContent() {
  const searchParams = useSearchParams();
  
  // Custom brand params
  const orgId = searchParams.get("orgId") || "acme";
  const brandColor = searchParams.get("color") || "blue"; // emerald, violet, blue, rose
  const themeMode = searchParams.get("theme") || "dark";   // light, dark
  const logoUrl = searchParams.get("logo") || "";

  // Widget State: 'closed' | 'minimized' | 'opened'
  const [state, setState] = useState<"closed" | "minimized" | "opened">("closed");
  
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial class on mount to support tailwind light/dark themes
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Sync state transitions to parent window for container resizing
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "widget:state", state }, "*");
    }
  }, [state]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Theme color maps
  const colorMap: Record<string, { primary: string; text: string; bgLight: string; border: string; glow: string }> = {
    blue: {
      primary: "bg-blue-600 hover:bg-blue-500",
      text: "text-blue-500 dark:text-blue-400",
      bgLight: "bg-blue-50/50 dark:bg-blue-950/20",
      border: "border-blue-500/20",
      glow: "shadow-blue-500/25",
    },
    emerald: {
      primary: "bg-emerald-600 hover:bg-emerald-500",
      text: "text-emerald-500 dark:text-emerald-400",
      bgLight: "bg-emerald-50/50 dark:bg-emerald-950/20",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/25",
    },
    violet: {
      primary: "bg-violet-600 hover:bg-violet-500",
      text: "text-violet-500 dark:text-violet-400",
      bgLight: "bg-violet-50/50 dark:bg-violet-950/20",
      border: "border-violet-500/20",
      glow: "shadow-violet-500/25",
    },
    rose: {
      primary: "bg-rose-600 hover:bg-rose-500",
      text: "text-rose-500 dark:text-rose-400",
      bgLight: "bg-rose-50/50 dark:bg-rose-950/20",
      border: "border-rose-500/20",
      glow: "shadow-rose-500/25",
    },
  };

  const defaultTheme = {
    primary: "bg-blue-600 hover:bg-blue-500",
    text: "text-blue-500 dark:text-blue-400",
    bgLight: "bg-blue-50/50 dark:bg-blue-950/20",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/25",
  };

  const currentTheme = colorMap[brandColor] || defaultTheme;

  // Send message handler
  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: String(messages.length + 1),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate agent replies after 1.5 seconds delay
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Thanks for asking! Our support representatives are currently processing your query.";
      const query = text.toLowerCase();

      if (query.includes("vapi") || query.includes("voice")) {
        replyText = "To connect Vapi voice sessions, copy your Public Key from dashboard.vapi.ai/keys, add it to your .env config, and initialize the useVapi hook.";
      } else if (query.includes("model")) {
        replyText = "We support all flagship models from OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and xAI (Grok-Beta) natively.";
      } else if (query.includes("latency")) {
        replyText = "Average system response latency is around 320ms, optimized via pre-warmed edge tunnels and direct Convex subscriptions.";
      }

      const assistantMessage: Message = {
        id: String(messages.length + 2),
        sender: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1500);
  };

  return (
    <div className="w-full h-full font-sans antialiased text-slate-800 dark:text-slate-200">
      <AnimatePresence mode="wait">
        
        {/* ─── STATE: CLOSED (Floating Button) ─── */}
        {state === "closed" && (
          <motion.div
            key="closed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full h-full flex items-center justify-center p-3"
          >
            <button
              onClick={() => setState("opened")}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 ${currentTheme.primary} ${currentTheme.glow}`}
            >
              <MessageCircle className="w-6 h-6 animate-pulse" />
            </button>
          </motion.div>
        )}

        {/* ─── STATE: MINIMIZED ─── */}
        {state === "minimized" && (
          <motion.div
            key="minimized"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full h-full p-2"
          >
            <div className="w-full h-12 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold border border-slate-700">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full rounded-lg object-contain" /> : "E"}
                </div>
                <span className="text-xs font-bold text-slate-200 truncate capitalize">{orgId} Support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setState("opened")}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setState("closed")}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── STATE: OPENED ─── */}
        {state === "opened" && (
          <motion.div
            key="opened"
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-full h-full flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className={`p-4 text-white flex items-center justify-between shadow-sm shrink-0 ${currentTheme.primary}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm border border-white/10">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full rounded-xl object-contain" /> : "E"}
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wide capitalize">{orgId} Support</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-white/80 font-medium">Assistant online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setState("minimized")}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setState("closed")}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/40">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 text-xs leading-relaxed max-w-[85%] ${
                    m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                      m.sender === "user" ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" : `${currentTheme.primary} text-white`
                    }`}
                  >
                    {m.sender === "user" ? "U" : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      m.sender === "user"
                        ? "bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tr-none"
                        : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 text-slate-800 dark:text-slate-200 rounded-tl-none"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className="text-[9px] text-slate-400 block text-right mt-1">{m.time}</span>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-2 items-center text-xs text-slate-400 mr-auto max-w-[80%]">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${currentTheme.primary} text-white`}>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="px-3 py-2.5 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length === 1 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(reply)}
                    className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all text-left bg-white dark:bg-slate-900 hover:scale-98 cursor-pointer ${currentTheme.text} ${currentTheme.border} ${currentTheme.bgLight}`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-2 shrink-0 items-center">
              <input
                type="text"
                placeholder="Ask support..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend(inputText);
                }}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-700"
              />
              <button
                onClick={() => handleSend(inputText)}
                className={`w-9 h-9 text-white rounded-xl flex items-center justify-center transition-transform active:scale-95 ${currentTheme.primary}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Footer Brand */}
            <div className="p-2 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/80 text-center flex items-center justify-center gap-1 text-[9px] text-slate-400 font-medium shrink-0">
              <span>Powered by Echo Support</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WidgetEmbedPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-500">Loading Widget...</div>}>
      <WidgetEmbedContent />
    </Suspense>
  );
}
