"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Plus,
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

export function ConversationsView() {
  // Org context (simulated)
  const orgId = "acme";
  const currentAgentId = "agent_1";

  // State
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("active");
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Priority | undefined>();
  const [assigneeFilter, setAssigneeFilter] = useState<string | undefined>();
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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

  // Determine which messages to show
  const displayMessages = msgSearch ? searchMessages : messages;

  // Convex Mutations
  const sendNewMessage = useMutation(api.conversations.postMessage);
  const markMessagesAsRead = useMutation(api.conversations.markAsRead);
  const updateConversationStatus = useMutation(api.conversations.updateConversationStatus);
  const startNewConversation = useMutation(api.conversations.createConversation);
  const bulkUpdateConversations = useMutation(api.conversations.bulkUpdateConversations);

  // Automatically select first conversation if none is active
  useEffect(() => {
    if (allConversations && allConversations.length > 0 && !activeId) {
      setActiveId(allConversations[0]._id);
    }
  }, [allConversations, activeId]);

  // Mark messages as read when active conversation switches or updates
  useEffect(() => {
    if (activeId) {
      markMessagesAsRead({
        conversationId: activeId as any,
        userId: currentAgentId,
      });
    }
  }, [activeId, displayMessages?.length, markMessagesAsRead, currentAgentId]);

  // Keyboard shortcuts
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!allConversations) return;

      // Cmd/Ctrl + A: Select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelectedConversationIds(allConversations.map(c => c._id));
      }

      // Escape: Deselect all
      if (e.key === "Escape") {
        setSelectedConversationIds([]);
      }

      // Arrow keys to navigate
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = activeId ? allConversations.findIndex(c => c._id === activeId) : -1;
        let newIndex: number;
        if (e.key === "ArrowUp") {
          newIndex = currentIndex > 0 ? currentIndex - 1 : allConversations.length - 1;
        } else {
          newIndex = currentIndex < allConversations.length - 1 ? currentIndex + 1 : 0;
        }
        if (newIndex >= 0) {
          setActiveId(allConversations[newIndex]._id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allConversations, activeId]);

  const handleSendMessage = async () => {
    if (!input.trim() || !activeId) return;

    await sendNewMessage({
      conversationId: activeId as any,
      senderId: currentAgentId,
      senderName: "Support Agent",
      senderType: "user",
      type: "text",
      content: input,
    });

    setInput("");
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

  const activeSession = allConversations?.find((c: any) => c._id === activeId);

  // Render function for individual messages
  const renderMessage = (m: any) => {
    const isAgent = m.senderType === "user";
    return (
      <div
        className={`flex gap-3 text-xs leading-relaxed max-w-[80%] ${
          isAgent ? "ml-auto flex-row-reverse" : "mr-auto"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
            isAgent ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          {isAgent ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
        </div>
        <div
          className={`px-3.5 py-2.5 rounded-2xl ${
            isAgent
              ? "bg-blue-600/10 border border-blue-500/20 text-slate-200 rounded-tr-none"
              : "bg-slate-900/60 border border-white/5 text-slate-300 rounded-tl-none"
          }`}
        >
          <p>{m.content}</p>

          {/* Status checks */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[9px] text-slate-500">
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isAgent && (
              <span>
                {m.status === "read" ? (
                  <CheckCheck className="w-3 h-3 text-blue-500" />
                ) : (
                  <Check className="w-3 h-3 text-slate-500" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render conversation list item
  const renderConversationItem = (c: any) => {
    const isSelected = selectedConversationIds.includes(c._id);
    const isActive = activeId === c._id;
    const priorityColors = {
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
          <p className="text-[10px] text-slate-500 truncate">{c.lastMessageText}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                priorityColors[c.priority]
              }`}
            >
              {c.priority}
            </span>
            {c.tags?.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {c.assigneeId && (
              <span className="text-[9px] text-slate-400">
                Assigned to: {c.assigneeId === "team" ? "Team" : MOCK_AGENTS.find(a => a.id === c.assigneeId)?.name || c.assigneeId}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      {/* ─── Session List Pane ─── */}
      <div className="border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Search & Actions Header */}
        <div className="p-3 border-b border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCreateMockConversation}
              className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" /> Create Mock Chat
            </button>
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
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">
                Priority
              </label>
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
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">
                Assignee
              </label>
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
              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">
                Tags
              </label>
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
            <span className="text-[10px] text-slate-300">
              {selectedConversationIds.length} selected
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleBulkUpdate({ isArchived: true })}
                className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-white/5 rounded hover:bg-slate-700"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkUpdate({ status: "resolved" })}
                className="text-[9px] px-1.5 py-0.5 bg-green-600/10 border border-green-500/20 rounded text-green-400 hover:bg-green-600/20"
              >
                Resolve
              </button>
              <button
                onClick={() => setSelectedConversationIds([])}
                className="text-[9px] px-1.5 py-0.5"
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

      {/* ─── Active Conversation View Pane ─── */}
      <div className="md:col-span-2 border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur-sm flex flex-col overflow-hidden">
        {activeSession ? (
          <>
            {/* Header bar */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-2 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-200">
                    {activeSession.priority.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">
                      Conversation #{activeSession._id.slice(-6)}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">
                      Org: {activeSession.orgId}
                    </span>
                  </div>
                </div>

                {/* Status Controls & Archive */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePin}
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
                        activeSession.status === "active"
                          ? "bg-blue-600/20 text-blue-400"
                          : ""
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
                </div>
              </div>

              {/* Conversation properties */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400">Priority:</span>
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${
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
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    !activeSession.assigneeId
                      ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                      : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => handleAssigneeChange("team")}
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
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
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${
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

            {/* Message History streams */}
            <div className="flex-1 bg-slate-950/20">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  Loading messages...
                </div>
              ) : displayMessages && displayMessages.length > 0 ? (
                msgSearch ? (
                  // For search results, use normal scroll
                  <div className="p-4 space-y-3.5 overflow-y-auto h-full">
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

            {/* Input Bar */}
            <div className="p-3 border-t border-white/5 flex gap-2 bg-slate-950/40">
              <input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                className="flex-1 pl-3.5 pr-4 py-2 bg-slate-900/60 border border-white/5 rounded-xl text-xs text-slate-250 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSendMessage}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-xs">
            No active session selected. Select a chat or create a mock conversation above.
          </div>
        )}
      </div>
    </div>
  );
}
