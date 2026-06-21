"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minus, ChevronUp } from "lucide-react";
import dynamic from "next/dynamic";

// Imports from local folders
import { WidgetRouterProvider, useWidgetRouter } from "../../hooks/use-widget-router";
import { useWidgetSession } from "../../hooks/use-widget-session";

// Fallback skeleton components
import { HomeScreenSkeleton, ChatMessagesSkeleton } from "../../components/skeleton";
import { ErrorBoundary } from "../../components/error-boundary";
import { ConnectionStatus } from "../../components/connection-status";

// Dynamic lazy loaded screen components
const HomeScreen = dynamic(() => import("../../components/screens/home-screen").then(mod => mod.HomeScreen), {
  loading: () => <HomeScreenSkeleton />,
});
const InboxScreen = dynamic(() => import("../../components/screens/inbox-screen").then(mod => mod.InboxScreen), {
  loading: () => <HomeScreenSkeleton />,
});
const ChatScreen = dynamic(() => import("../../components/screens/chat-screen").then(mod => mod.ChatScreen), {
  loading: () => <ChatMessagesSkeleton />,
});
const KbScreen = dynamic(() => import("../../components/screens/kb-screen").then(mod => mod.KbScreen), {
  loading: () => <HomeScreenSkeleton />,
});
const VoiceScreen = dynamic(() => import("../../components/screens/voice-screen").then(mod => mod.VoiceScreen), {
  loading: () => <HomeScreenSkeleton />,
});
const HandoffScreen = dynamic(() => import("../../components/screens/handoff-screen").then(mod => mod.HandoffScreen), {
  loading: () => <HomeScreenSkeleton />,
});

const GREETING_TEXT = "Hi there! 👋 Welcome to Echo support. Ask us anything about integration, billing, or custom agents.";

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

  // Widget Open State: 'closed' | 'minimized' | 'opened'
  const [state, setState] = useState<"closed" | "minimized" | "opened">("closed");
  
  // Input tracking
  const [inputText, setInputText] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Router context hook
  const { currentScreen } = useWidgetRouter();

  // Session & Message sync hook
  const {
    messages,
    sendMessage,
    setTypingStatus,
    isHydrated,
  } = useWidgetSession(orgId);

  // Seed greeting message if conversation is empty
  useEffect(() => {
    if (isHydrated && messages.length === 0) {
      sendMessage(GREETING_TEXT, "assistant");
    }
  }, [isHydrated, messages.length, sendMessage]);

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

  // Broadcast user typing status on input change
  const handleInputChange = (val: string) => {
    setInputText(val);
    if (val.trim()) {
      setTypingStatus("typing");
    } else {
      setTypingStatus("idle");
    }
  };

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

    sendMessage(text, "user");
    setInputText("");
    setTypingStatus("idle");
    setIsAgentTyping(true);

    // Simulate agent replies after 1.5 seconds delay
    setTimeout(() => {
      setIsAgentTyping(false);
      let replyText = "Thanks for asking! Our support representatives are currently processing your query.";
      const query = text.toLowerCase();

      if (query.includes("vapi") || query.includes("voice")) {
        replyText = "To connect Vapi voice sessions, copy your Public Key from dashboard.vapi.ai/keys, add it to your .env config, and initialize the useVapi hook.";
      } else if (query.includes("model")) {
        replyText = "We support all flagship models from OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and xAI (Grok-Beta) natively.";
      } else if (query.includes("latency")) {
        replyText = "Average system response latency is around 320ms, optimized via pre-warmed edge tunnels and direct Convex subscriptions.";
      }

      sendMessage(replyText, "assistant");
    }, 1500);
  };

  // Render current screen from stack router
  const renderScreen = () => {
    switch (currentScreen) {
      case "loading":
        return <HomeScreenSkeleton />;
      case "home":
        return <HomeScreen currentTheme={currentTheme} logoUrl={logoUrl} orgId={orgId} />;
      case "inbox":
        return <InboxScreen currentTheme={currentTheme} messages={messages} />;
      case "chat":
        return (
          <ChatScreen
            currentTheme={currentTheme}
            messages={messages}
            sendMessage={sendMessage}
            isAgentTyping={isAgentTyping}
            inputText={inputText}
            handleInputChange={handleInputChange}
            handleSend={handleSend}
            QUICK_REPLIES={QUICK_REPLIES}
          />
        );
      case "kb":
        return <KbScreen currentTheme={currentTheme} />;
      case "voice":
        return <VoiceScreen currentTheme={currentTheme} />;
      case "handoff":
        return <HandoffScreen currentTheme={currentTheme} />;
      default:
        return <HomeScreen currentTheme={currentTheme} logoUrl={logoUrl} orgId={orgId} />;
    }
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
            {/* Main Header */}
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

            {/* Online/Offline Connection Status banner */}
            <ConnectionStatus />

            {/* Screen Transitions Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <ErrorBoundary>
                    {renderScreen()}
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
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
      <WidgetRouterProvider>
        <WidgetEmbedContent />
      </WidgetRouterProvider>
    </Suspense>
  );
}
