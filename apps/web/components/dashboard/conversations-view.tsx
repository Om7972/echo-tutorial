"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Send,
  User,
  Bot,
  Search,
  Check,
  CheckCheck,
  Archive,
  ArchiveX,
  Clock,
  CheckCircle,
  Pin,
  PinOff,
  Users,
  Filter,
  X,
  ChevronDown,
  AlertCircle,
  Bell,
  Plus,
  Paperclip,
  Mic,
  Smile,
  MoreVertical,
  MessageSquare,
  StickyNote,
  Sidebar,
  EyeOff,
  ThumbsUp,
  Heart,
  Laugh,
  Meh,
  Frown,
  Angry,
} from "lucide-react";
import { usePaginatedMessages } from "@/hooks/use-paginated-messages";
import { VirtualizedInfiniteScroll } from "@workspace/ui/components/virtualized-infinite-scroll";

type FilterStatus = "active" | "resolved" | "waiting" | "all";
type Priority = "low" | "medium" | "high";

const MOCK_AGENTS = [
  { id: "agent_1", name: "Support Agent 1", online: true },
  { id: "agent_2", name: "Support Agent 2", online: true },
  { id: "agent_3", name: "Support Agent 3", online: false },
];

const MOCK_TAGS = ["billing", "technical", "urgent", "feedback", "feature_request"];

const QUICK_REPLIES = [
  "Thanks for reaching out! How can I help?",
  "I'm sorry for the inconvenience. Let me check that for you.",
  "Could you please provide more details?",
  "That sounds like it needs further investigation.",
];

const EMOJI_OPTIONS = [
  { emoji: "👍", component: ThumbsUp },
  { emoji: "❤️", component: Heart },
  { emoji: "😂", component: Laugh },
  { emoji: "�", component: Meh },
  { emoji: "😢", component: Frown },
  { emoji: "😠", component: Angry },
];

export function ConversationsView() {
  // Org context (simulated)
  const orgId = "acme";
  const currentAgentId = "agent_1";
  const currentAgentName = "Support Agent 1";

  // State
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("active");
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Priority | undefined>();
  const [assigneeFilter, setAssigneeFilter] = useState<string | null | undefined>();
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Convex Queries
  const allConversations = useQuery(api.conversations.listConversations, {
    orgId,
    status: activeFilter === "all" ? undefined : activeFilter,
    isArchived: showArchived,
    search: search || undefined,
    priority: priorityFilter,
    assigneeId: assigneeFilter,
    tags: tagFilters.length > 0 ? tagFilters : undefined,
  });

  // Use our new paginated messages hook
  const {
    messages,
    loadPrevious,
    hasMorePrevious,
    isLoadingPrevious,
    isLoading: isLoadingMessages,
  } = usePaginatedMessages({
    conversationId: activeId as any,
    enabled: !!activeId && !msgSearch,
  });

  // Fallback to search query when msgSearch is active
  const searchMessages = useQuery(
    api.conversations.getConversationMessages,
    activeId && msgSearch
      ? {
          conversationId: activeId as any,
          searchQuery: msgSearch,
        }
      : "skip"
  );

  // Get pinned messages
  const pinnedMessages = useQuery(
    api.conversations.getPinnedMessages,
    activeId ? { conversationId: activeId as any } : "skip"
  );

  // Get typing statuses
  const typingStatuses = useQuery(
    api.conversations.getTypingStatuses,
    activeId ? { conversationId: activeId as any } : "skip"
  );

  // Get quick replies
  const quickReplies = useQuery(
    api.conversations.getQuickReplies,
    { orgId }
  );

  // Escalation System Queries
  const transferHistory = useQuery(
    api.escalation.getTransferHistory,
    activeId ? { conversationId: activeId as any } : "skip"
  );

  const auditLogs = useQuery(
    api.escalation.getAuditLogs,
    { orgId }
  );

  const notifications = useQuery(
    api.escalation.listNotifications,
    { orgId }
  );

  // Determine which messages to show
  const displayMessages = msgSearch ? searchMessages : messages;

  // Convex Mutations
  const sendNewMessage = useMutation(api.conversations.postMessage);
  const markAsRead = useMutation(api.conversations.markAsRead);
  const updateConversationStatus = useMutation(api.conversations.updateConversationStatus);
  const startNewConversation = useMutation(api.conversations.createConversation);

  // Escalation System Mutations
  const takeoverConversation = useMutation(api.escalation.takeoverConversation);
  const releaseTakeover = useMutation(api.escalation.releaseTakeover);
  const markNotificationAsRead = useMutation(api.escalation.markNotificationAsRead);
  const bulkUpdateConversations = useMutation(api.conversations.bulkUpdateConversations);
  const pinMessage = useMutation(api.conversations.pinMessage);
  const unpinMessage = useMutation(api.conversations.unpinMessage);
  const addReaction = useMutation(api.conversations.addReaction);
  const removeReaction = useMutation(api.conversations.removeReaction);
  const addInternalNote = useMutation(api.conversations.addInternalNote);
  const updateTypingStatus = useMutation(api.conversations.updateTypingStatus);

  // Automatically select first conversation if none is active
  useEffect(() => {
    if (allConversations && allConversations.length > 0 && !activeId) {
      setActiveId(allConversations[0]!._id);
    }
  }, [allConversations, activeId]);

  // Mark messages as read when active conversation switches or updates
  useEffect(() => {
    if (activeId) {
      markAsRead({
        conversationId: activeId as any,
        userId: currentAgentId,
      });
    }
  }, [activeId, displayMessages?.length, markAsRead, currentAgentId]);

  // Handle typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (!typingTimeout) {
      updateTypingStatus({
        conversationId: activeId as any,
        userId: currentAgentId,
        userName: currentAgentName,
        isTyping: true,
      });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      updateTypingStatus({
        conversationId: activeId as any,
        userId: currentAgentId,
        userName: currentAgentName,
        isTyping: false,
      });
      setTypingTimeout(null);
    }, 1000);

    setTypingTimeout(timeout);
  };

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  const handleSendMessage = async () => {
    if (!input.trim() || !activeId) return;

    if (isInternalNoteMode) {
      await addInternalNote({
        conversationId: activeId as any,
        note: input,
        authorId: currentAgentId,
        authorName: currentAgentName,
      });
    } else {
      await sendNewMessage({
        conversationId: activeId as any,
        senderId: currentAgentId,
        senderName: currentAgentName,
        senderType: "user",
        type: "text",
        content: input,
        replyToId: replyToMessage?._id,
      });
    }

    setInput("");
    setReplyToMessage(null);
    setIsInternalNoteMode(false);
  };

  const handleStatusChange = async (status: "active" | "resolved" | "waiting") => {
    if (!activeId) return;
    await updateConversationStatus({
      conversationId: activeId as any,
      status,
    });
  };

  const handlePriorityChange = async (priority: Priority) => {
    if (!activeId) return;
    await updateConversationStatus({
      conversationId: activeId as any,
      priority,
    });
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    if (!activeId) return;
    await updateConversationStatus({
      conversationId: activeId as any,
      assigneeId: assigneeId || undefined,
    });
  };

  const handleTogglePin = async () => {
    if (!activeId) return;
    const activeConv = allConversations?.find((c: any) => c._id === activeId);
    if (!activeConv) return;
    await updateConversationStatus({
      conversationId: activeId as any,
      isPinned: !activeConv.isPinned,
    });
  };

  const handleArchiveToggle = async () => {
    if (!activeId) return;
    const activeConv = allConversations?.find((c: any) => c._id === activeId);
    if (!activeConv) return;

    await updateConversationStatus({
      conversationId: activeId as any,
      isArchived: !activeConv.isArchived,
    });

    // Deselect conversation since it moved to/from archive list
    setActiveId(null);
  };

  const handleCreateMockConversation = async () => {
    const randomNames = ["Devon Lane", "Jenny Wilson", "Kristin Watson", "Bessie Cooper"];
    const name = randomNames[Math.floor(Math.random() * randomNames.length)]!;
    const priorities: Priority[] = ["low", "medium", "high"];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const tags = MOCK_TAGS.slice(0, Math.floor(Math.random() * 3));

    await startNewConversation({
      orgId,
      initialMessage: "Hello! I have a question about setting up custom integrations.",
      senderId: `vis_${Math.random().toString(36).substring(2, 9)}`,
      senderName: name,
      senderType: "visitor",
      priority,
      tags,
    });
  };

  const handleToggleConversationSelection = (id: string) => {
    setSelectedConversationIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async (updates: any) => {
    if (selectedConversationIds.length === 0) return;
    await bulkUpdateConversations({
      conversationIds: selectedConversationIds as any[],
      ...updates,
    });
    setSelectedConversationIds([]);
  };

  const handleToggleMessagePin = async (msg: any) => {
    if (!activeId) return;
    const isPinned = pinnedMessages?.some((p: any) => p._id === msg._id);
    if (isPinned) {
      await unpinMessage({ messageId: msg._id });
    } else {
      await pinMessage({
        messageId: msg._id,
        conversationId: activeId as any,
        pinnedById: currentAgentId,
      });
    }
  };

  const handleToggleReaction = async (msg: any, emoji: string) => {
    if (!activeId) return;
    try {
      await removeReaction({ messageId: msg._id, userId: currentAgentId, emoji });
    } catch {
      await addReaction({
        messageId: msg._id,
        conversationId: activeId as any,
        userId: currentAgentId,
        emoji,
      });
    }
  };

  const activeSession = allConversations?.find((c: any) => c._id === activeId);

  // Render function for individual messages
  const renderMessage = (m: any) => {
    const isAgent = m.senderType === "user";
    const isPinned = pinnedMessages?.some((p: any) => p._id === m._id);

    // Mock reactions
    const mockReactions = [
      { emoji: "👍", count: 2, users: ["agent_1", "agent_2"] },
    ];

    return (
      <div
        className={`flex gap-3 text-xs leading-relaxed max-w-[80%] ${isAgent ? "ml-auto flex-row-reverse" : "mr-auto"}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
            isAgent ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          {isAgent ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
        </div>
        <div className="flex flex-col gap-1">
          {replyToMessage?._id === m._id && (
            <div className="text-xs text-slate-400">Replying to this message</div>
          )}
          <div
            className={`px-3.5 py-2.5 rounded-2xl relative group ${
              isAgent
                ? "bg-blue-600/10 border border-blue-500/20 text-slate-200 rounded-tr-none"
                : "bg-slate-900/60 border border-white/5 text-slate-300 rounded-tl-none"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p>{m.content}</p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setReplyToMessage(m)}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Reply"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleToggleMessagePin(m)}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Pin Message"
                  >
                    {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 hover:bg-white/10 rounded"
                    title="Add Reaction"
                  >
                    <Smile className="w-3 h-3" />
                  </button>
                  <button className="p-1 hover:bg-white/10 rounded" title="More Actions">
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Reactions */}
            {mockReactions.length > 0 && (
              <div className="flex gap-1 mt-1">
                {mockReactions.map((r: any) => (
                  <button
                    key={r.emoji}
                    onClick={() => handleToggleReaction(m, r.emoji)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700"
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px]">{r.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Status checks */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-slate-400">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isAgent && (
                <span>
                  {m.status === "read" ? (
                    <CheckCheck className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Check className="w-3 h-3 text-slate-400" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render conversation list item
  const renderConversationItem = (c: any) => {
    const isSelected = selectedConversationIds.includes(c._id);
    const isActive = activeId === c._id;
    const priorityColors: Record<string, string> = {
      high: "bg-red-500/10 text-red-400 border-red-500/20",
      medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      low: "bg-green-500/10 text-green-400 border-green-500/20",
    };

    // Calculate SLA status
    const slaStatus = c.slaDeadline
      ? c.slaDeadline < Date.now()
        ? "overdue"
        : c.slaDeadline - Date.now() < 1800000 // 30 mins
        ? "warning"
        : "ok"
      : "ok";

    return (
      <div
        key={c._id}
        onClick={(e) => {
          if (e.shiftKey) {
            handleToggleConversationSelection(c._id);
          } else {
            setActiveId(c._id);
          }
        }}
        className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
          isActive
            ? "bg-blue-600/10 border-blue-500"
            : isSelected
            ? "bg-slate-800/50 border-slate-500"
            : "border-transparent hover:bg-white/5"
        }`}
      >
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleConversationSelection(c._id)}
            className="w-3.5 h-3.5 rounded-sm border border-slate-500 bg-transparent accent-blue-500"
            aria-label="Select conversation"
            title="Select conversation"
          />
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-300 flex-shrink-0">
          {c.priority.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-baseline mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              {c.isPinned && <Pin className="w-2.5 h-2.5 text-blue-400" />}
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                Conversation #{c._id.slice(-6)}
              </h4>
              {slaStatus === "overdue" && (
                <AlertCircle className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
              )}
              {slaStatus === "warning" && (
                <AlertCircle className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 truncate">{c.lastMessageText}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                priorityColors[c.priority]
              }`}
            >
              {c.priority}
            </span>
            {c.tags?.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {c.assigneeId && (
              <span className="text-[10px] text-slate-400">
                Assigned to: {c.assigneeId === "team" ? "Team" : MOCK_AGENTS.find(a => a.id === c.assigneeId)?.name || c.assigneeId}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[700px]">
      {/* Left Column: Conversation List */}
      <div className="md:col-span-3 border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Search & Actions Header */}
        <div className="p-3 border-b border-white/5 space-y-2">
          <div className="flex items-center justify-between gap-1.5 relative">
            <button
              onClick={handleCreateMockConversation}
              className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" /> New Chat
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowArchived((prev) => !prev)}
                className={`text-[10px] flex items-center gap-1 font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showArchived
                    ? "bg-purple-600/10 border-purple-500 text-purple-400"
                    : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Archive className="w-3 h-3" /> {showArchived ? "Archived" : "Inbox"}
              </button>
              
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer relative ${
                    showNotifications ? "bg-blue-600/20 text-blue-400" : ""
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {notifications && notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-slate-950/95 border border-white/10 rounded-xl shadow-2xl p-2 z-50 space-y-1.5 backdrop-blur-md">
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-white/5 flex justify-between items-center">
                      <span>Notifications</span>
                      {notifications && notifications.filter((n: any) => !n.isRead).length > 0 && (
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-semibold">
                          {notifications.filter((n: any) => !n.isRead).length} New
                        </span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {notifications && notifications.length > 0 ? (
                        notifications.map((n: any) => (
                          <button
                            key={n._id}
                            onClick={async () => {
                              await markNotificationAsRead({ notificationId: n._id });
                              if (n.conversationId) {
                                setActiveId(n.conversationId);
                              }
                              setShowNotifications(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg transition-colors text-[10px] flex flex-col gap-0.5 ${
                              n.isRead ? "hover:bg-white/5 text-slate-400" : "bg-blue-500/5 hover:bg-blue-500/10 text-slate-200 font-semibold"
                            }`}
                          >
                            <span className="flex justify-between">
                              <span className="truncate max-w-[150px]">{n.title}</span>
                              <span className="text-[8px] text-slate-500">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                            <span className="text-[9px] text-slate-500 font-normal line-clamp-2">{n.message}</span>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-6 text-[10px] text-slate-500 italic">No notifications.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/10"
            />
          </div>
        </div>

        {/* Filters Tabs */}
        <div className="flex border-b border-white/5 text-[10px] font-bold text-slate-400">
          {(["all", "active", "waiting", "resolved"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-1 py-2 text-center border-b-2 capitalize transition-colors cursor-pointer ${
                activeFilter === f
                  ? "border-blue-500 text-blue-400 bg-blue-500/5"
                  : "border-transparent hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border-b-2 border-transparent flex items-center gap-1 ${
              showFilters ? "border-blue-500 text-blue-400" : "text-slate-400"
            }`}
          >
            <Filter className="w-2.5 h-2.5" /> <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-3 border-b border-white/5 bg-slate-900/50 space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Priority</label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(priorityFilter === p ? undefined : p)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      priorityFilter === p
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Assignee</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setAssigneeFilter(assigneeFilter === undefined ? null : undefined)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    assigneeFilter === undefined
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setAssigneeFilter(assigneeFilter === null ? undefined : null)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    assigneeFilter === null
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400"
                  }`}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => setAssigneeFilter(assigneeFilter === "team" ? undefined : "team")}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    assigneeFilter === "team"
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400"
                  }`}
                >
                  <Users className="w-2.5 h-2.5 inline mr-0.5" /> Team
                </button>
                {MOCK_AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() =>
                      setAssigneeFilter(assigneeFilter === agent.id ? undefined : agent.id)
                    }
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      assigneeFilter === agent.id
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-1">
                {MOCK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTagFilters(
                        tagFilters.includes(tag)
                          ? tagFilters.filter((t) => t !== tag)
                          : [...tagFilters, tag]
                      )
                    }
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      tagFilters.includes(tag)
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedConversationIds.length > 0 && (
          <div className="p-2 border-b border-white/5 bg-blue-500/5 flex items-center justify-between">
            <span className="text-[10px] text-slate-200">
              {selectedConversationIds.length} selected
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleBulkUpdate({ isArchived: true })}
                className="text-[10px] px-1.5 py-0.5 bg-slate-800 border border-white/5 rounded hover:bg-slate-700"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkUpdate({ status: "resolved" })}
                className="text-[10px] px-1.5 py-0.5 bg-green-600/10 border border-green-500/20 rounded text-green-400 hover:bg-green-600/20"
              >
                Resolve
              </button>
              <button
                onClick={() => setSelectedConversationIds([])}
                className="text-[10px] px-1.5 py-0.5"
                aria-label="Clear selection"
                title="Clear selection"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 bg-slate-950/40">
          {allConversations && allConversations.length > 0 ? (
            allConversations.map((c: any) => renderConversationItem(c))
          ) : (
            <div className="text-center py-16 text-xs text-slate-500">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Middle Column: Chat */}
      <div className="md:col-span-6 border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur-sm flex flex-col overflow-hidden">
        {activeSession ? (
          <>
            {/* Header bar */}
            <div className="p-3 border-b border-white/5 flex flex-col gap-2 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-200">
                    {activeSession.priority.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      Conversation #{activeSession._id.slice(-6)}
                      {activeSession.escalationReason && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                          Escalated
                        </span>
                      )}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">
                      Org: {activeSession.orgId}
                    </span>
                  </div>
                </div>

                {/* Status Controls & Archive */}
                <div className="flex items-center gap-2">
                  {/* Lock/Takeover actions */}
                  {activeSession.isLocked ? (
                    activeSession.assigneeId === currentAgentId ? (
                      <button
                        onClick={async () => {
                          await releaseTakeover({
                            conversationId: activeSession._id,
                            operatorId: currentAgentId,
                            operatorName: currentAgentName,
                          });
                        }}
                        className="text-[9px] bg-yellow-600/15 border border-yellow-500/30 hover:bg-yellow-600/25 text-yellow-400 font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        Release Lock
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await takeoverConversation({
                            conversationId: activeSession._id,
                            operatorId: currentAgentId,
                            operatorName: currentAgentName,
                          });
                        }}
                        className="text-[9px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        Takeover
                      </button>
                    )
                  ) : (
                    <button
                      onClick={async () => {
                        await takeoverConversation({
                          conversationId: activeSession._id,
                          operatorId: currentAgentId,
                          operatorName: currentAgentName,
                        });
                      }}
                      className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      Takeover
                    </button>
                  )}

                  <button
                    onClick={handleTogglePin}
                    title="Pin Conversation"
                    className={`p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                      activeSession.isPinned ? "bg-blue-600/20 text-blue-400" : ""
                    }`}
                  >
                    {activeSession.isPinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="flex items-center rounded-lg border border-white/5 overflow-hidden">
                    <button
                      onClick={() => handleStatusChange("active")}
                      title="Mark Active"
                      className={`p-1.5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                        activeSession.status === "active" ? "bg-blue-600/20 text-blue-400" : ""
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange("resolved")}
                      title="Mark Resolved"
                      className={`p-1.5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                        activeSession.status === "resolved"
                          ? "bg-emerald-600/20 text-emerald-400"
                          : ""
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleArchiveToggle}
                    title={activeSession.isArchived ? "Unarchive" : "Archive"}
                    className={`p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                      activeSession.isArchived ? "bg-purple-600/20 text-purple-400" : ""
                    }`}
                  >
                    {activeSession.isArchived ? (
                      <ArchiveX className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowCustomerSidebar(!showCustomerSidebar)}
                    title="Toggle Sidebar"
                    className={`p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                      showCustomerSidebar ? "bg-blue-600/20 text-blue-400" : ""
                    }`}
                  >
                    <Sidebar className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lock Warning Banner */}
              {activeSession.isLocked && (
                <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>
                      Locked by <strong>{activeSession.lockedBy || "Queue"}</strong>. AI is paused.
                      {activeSession.escalationReason && (
                        <span> Trigger: <strong>{activeSession.escalationReason.replace("_", " ")}</strong>.</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Conversation properties */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400">Priority:</span>
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      activeSession.priority === p
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <span className="text-[10px] text-slate-400 ml-2">Assign:</span>
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    !activeSession.assigneeId
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => handleAssigneeChange("team")}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    activeSession.assigneeId === "team"
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Users className="w-2.5 h-2.5 inline mr-0.5" /> Team
                </button>
                {MOCK_AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAssigneeChange(agent.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      activeSession.assigneeId === agent.id
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned messages */}
            {pinnedMessages && pinnedMessages.length > 0 && (
              <div className="p-2 border-b border-white/5 bg-slate-950/30">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                  <Pin className="w-2.5 h-2.5" />
                  <span>Pinned messages</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pinnedMessages.map((msg: any) => (
                    <div
                      key={msg._id}
                      className="px-2 py-1 bg-slate-800/50 rounded-lg border border-white/5 text-[10px] text-slate-300 truncate max-w-full"
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inner Message Search Bar */}
            <div className="p-2 border-b border-white/5 bg-slate-950/20 flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-500 ml-1.5" />
              <input
                type="text"
                placeholder="Search messages..."
                value={msgSearch}
                onChange={(e) => setMsgSearch(e.target.value)}
                className="flex-1 bg-transparent text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Quick replies */}
            <div className="p-2 border-b border-white/5 bg-slate-950/20 flex flex-wrap gap-1">
              {QUICK_REPLIES.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => setInput(reply)}
                  className="text-[10px] px-2 py-1 bg-slate-800/50 rounded-lg border border-white/5 text-slate-300 hover:bg-slate-700/50"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Message History streams */}
            <div className="flex-1 bg-slate-950/20">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  Loading messages...
                </div>
              ) : displayMessages && displayMessages.length > 0 ? (
                msgSearch ? (
                  // For search results, use normal scroll
                  <div className="p-3 space-y-3.5 overflow-y-auto h-full">
                    {displayMessages.map((m: any) => renderMessage(m))}
                  </div>
                ) : (
                  // For normal view, use virtualized infinite scroll
                  <VirtualizedInfiniteScroll
                    items={displayMessages}
                    loadPrevious={loadPrevious}
                    hasMorePrevious={hasMorePrevious}
                    isLoadingPrevious={isLoadingPrevious}
                    renderItem={renderMessage}
                    autoScrollToBottom={true}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  No messages found.
                </div>
              )}
            </div>

            {/* Typing indicator */}
            {typingStatuses && typingStatuses.length > 0 && (
              <div className="p-2 border-t border-white/5 bg-slate-950/30">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span>{typingStatuses.map((t: any) => t.userName).join(", ")} is typing...</span>
                </div>
              </div>
            )}

            {/* Reply to */}
            {replyToMessage && (
              <div className="p-2 border-t border-white/5 bg-slate-950/30 flex items-center justify-between gap-2">
                <div className="text-[10px] text-slate-300 truncate">
                  Replying to: {replyToMessage.content}
                </div>
                <button
                  onClick={() => setReplyToMessage(null)}
                  className="text-slate-400 hover:text-slate-200"
                  aria-label="Cancel reply"
                  title="Cancel reply"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-white/5 flex flex-col gap-2 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInternalNoteMode(!isInternalNoteMode)}
                  className={`p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer ${
                    isInternalNoteMode ? "bg-yellow-600/20 text-yellow-400" : ""
                  }`}
                  title="Internal Note"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                </button>
                 <button className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white" title="Attach Files">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white" title="Voice Note">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white"
                  title="Emoji Keyboard"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isInternalNoteMode ? "Write an internal note..." : "Type your message..."}
                    rows={1}
                    className="w-full pl-3.5 pr-12 py-2 bg-slate-900/60 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none max-h-24"
                    style={{
                      height: "auto",
                      minHeight: "40px",
                    }}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <button
                      onClick={handleSendMessage}
                      disabled={!input.trim()}
                      title="Send Message"
                      className="w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {isInternalNoteMode && (
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                  <EyeOff className="w-3 h-3" />
                  <span>This is an internal note, visible only to your team</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-xs">
            No active session selected. Select a chat or create a mock conversation above.
          </div>
        )}
      </div>

      {/* Right Column: Customer Profile Sidebar */}
      {showCustomerSidebar && (
        <div className="md:col-span-3 border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
            <h3 className="text-xs font-bold text-slate-100">Customer Profile</h3>
            <button
              onClick={() => setShowCustomerSidebar(false)}
              className="p-1 rounded hover:bg-white/5 text-slate-400"
              aria-label="Close customer profile sidebar"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Customer info */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-2xl font-bold text-slate-300 mx-auto mb-3">
                V
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Visitor</h4>
              <p className="text-xs text-slate-400">visitor@example.com</p>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex justify-between">
                <span>First seen</span>
                <span>2 days ago</span>
              </div>
              <div className="text-xs text-slate-400 flex justify-between">
                <span>Last seen</span>
                <span>5 mins ago</span>
              </div>
              <div className="text-xs text-slate-400 flex justify-between">
                <span>Conversations</span>
                <span>3</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h5 className="text-[10px] font-semibold text-slate-300 mb-2">Tags</h5>
              <div className="flex flex-wrap gap-1">
                {["new_customer", "premium", "vip"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 bg-slate-800/50 rounded-lg border border-white/5 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h5 className="text-[10px] font-semibold text-slate-300 mb-2">Notes</h5>
              <div className="bg-slate-800/30 p-2 rounded-lg border border-white/5">
                <p className="text-xs text-slate-300">
                  Customer has been with us for over a year. Very valuable account.
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Added by Agent 2, 3 days ago</p>
              </div>
            </div>

            {/* Transfer History */}
            <div>
              <h5 className="text-[10px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">Transfer History</h5>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {transferHistory && transferHistory.length > 0 ? (
                  transferHistory.map((th: any) => (
                    <div key={th._id} className="text-[10px] text-slate-400 bg-slate-900/40 border border-white/5 p-2 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-slate-300 font-medium">
                        <span>{th.fromAssignee} → {th.toAssignee}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(th.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 italic">Reason: {th.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-500 italic">No transfers recorded.</div>
                )}
              </div>
            </div>

            {/* Audit Logs */}
            <div>
              <h5 className="text-[10px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">Audit Log</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.slice(0, 5).map((al: any) => (
                    <div key={al._id} className="text-[10px] text-slate-400 bg-slate-900/40 border border-white/5 p-2 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-slate-300 font-medium">
                        <span className="uppercase text-[9px] bg-white/5 px-1 py-0.5 rounded text-slate-400">{al.action}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500">{al.details}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-500 italic">No system audits found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
