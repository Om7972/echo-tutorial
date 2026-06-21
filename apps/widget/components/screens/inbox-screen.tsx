"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Search,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  CheckCircle2,
  Check,
} from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

type FilterStatus = "all" | "active" | "resolved" | "waiting";

interface InboxScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
  messages: any[];
}

// Mock conversations for demonstration
const initialMockConversations = [
  {
    id: "conv-1",
    title: "Current Support Session",
    lastMessage: "How do I integrate Vapi with my existing app?",
    timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
    status: "active" as const,
    unreadCount: 3,
    isPinned: true,
    isArchived: false,
  },
  {
    id: "conv-2",
    title: "Billing Inquiry",
    lastMessage: "Thanks for clarifying the pricing tiers!",
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    status: "resolved" as const,
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
  },
  {
    id: "conv-3",
    title: "Feature Request",
    lastMessage: "We're looking into adding that feature soon.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    status: "waiting" as const,
    unreadCount: 1,
    isPinned: false,
    isArchived: false,
  },
  {
    id: "conv-4",
    title: "Old Support Thread",
    lastMessage: "This issue has been resolved.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    status: "resolved" as const,
    unreadCount: 0,
    isPinned: false,
    isArchived: true,
  },
];

export function InboxScreen({ currentTheme, messages }: InboxScreenProps) {
  const { pop, push } = useWidgetRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState(initialMockConversations);
  const [showArchived, setShowArchived] = useState(false);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Filter by archive status
      if (conv.isArchived !== showArchived) return false;

      // Filter by status
      if (activeFilter !== "all" && conv.status !== activeFilter) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.title.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [conversations, activeFilter, searchQuery, showArchived]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return "Just now";
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const togglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, isPinned: !conv.isPinned } : conv
      )
    );
    setContextMenuId(null);
  };

  const toggleArchive = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, isArchived: !conv.isArchived } : conv
      )
    );
    setContextMenuId(null);
  };

  const statusConfig = {
    active: { label: "Open", color: "blue" },
    waiting: { label: "Waiting", color: "yellow" },
    resolved: { label: "Resolved", color: "emerald" },
  };

  const getStatusStyle = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    return {
      bg: `bg-${config.color}-500/10`,
      text: `text-${config.color}-400`,
      border: `border-${config.color}-500/20`,
    };
  };

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

      {/* Search bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {(["all", "active", "waiting", "resolved"] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeFilter === status
                ? "border-blue-500 text-blue-500 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {status === "all" ? "All" : statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Toggle Archived */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 shrink-0">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-[10px] flex items-center gap-1 font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            showArchived
              ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
          }`}
        >
          {showArchived ? <ArchiveRestore className="w-2.5 h-2.5" /> : <Archive className="w-2.5 h-2.5" />}
          {showArchived ? "Archived" : "View Archived"}
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv, i) => {
            const style = getStatusStyle(conv.status);
            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <div
                  onClick={() => {
                    // push("chat"); // Would navigate to specific chat
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 flex flex-col text-left transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.isPinned && <Pin className="w-3 h-3 text-blue-400 shrink-0" />}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {conv.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(conv.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === conv.id ? null : conv.id);
                        }}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 truncate mt-1 w-full leading-relaxed">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center justify-between mt-2 w-full">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {statusConfig[conv.status].label}
                    </span>

                    {conv.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Context Menu */}
                {contextMenuId === conv.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-2 top-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={() => togglePin(conv.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                    >
                      {conv.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      {conv.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => toggleArchive(conv.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                    >
                      {conv.isArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                      {conv.isArchived ? "Unarchive" : "Archive"}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-xs text-slate-400">No conversations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
