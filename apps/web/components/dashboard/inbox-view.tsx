"use client"

import { useState } from "react"
import { Mail, Search, Star, Archive, Trash2, ShieldAlert } from "lucide-react"

interface Message {
  id: string
  sender: string
  subject: string
  preview: string
  time: string
  unread: boolean
  starred: boolean
  tag: string
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "Sarah Jenkins",
    subject: "Feedback on Beta Release v2.4",
    preview: "Overall the new UI looks incredible. However, we found a couple of minor alignment issues on the analytics tab when running on mobile browsers...",
    time: "10:24 AM",
    unread: true,
    starred: true,
    tag: "Feedback",
  },
  {
    id: "2",
    sender: "Initech Support",
    subject: "Urgent API Access Renewal Needed",
    preview: "This is a reminder that your developer credentials for the live sandbox environment are expiring in 48 hours. Please update your API tokens...",
    time: "Yesterday",
    unread: true,
    starred: false,
    tag: "Alert",
  },
  {
    id: "3",
    sender: "Marcus Vance",
    subject: "Q3 Billing Invoice #39281",
    preview: "Thanks for choosing Acme Enterprise plans. Your automatic credit card invoice has been processed successfully. Download the full PDF receipt here...",
    time: "Oct 19",
    unread: false,
    starred: true,
    tag: "Billing",
  },
  {
    id: "4",
    sender: "AI Agent Coordinator",
    subject: "Agent 'Support Bot' connection failed",
    preview: "We detected that the custom webhook endpoint for Support Bot returned a 500 error during a conversation transfer. Please audit your server logs...",
    time: "Oct 18",
    unread: false,
    starred: false,
    tag: "System",
  },
]

export function InboxView() {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [search, setSearch] = useState("")

  const toggleStar = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, starred: !msg.starred } : msg))
    )
  }

  const markRead = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, unread: false } : msg))
    )
  }

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  const filtered = messages.filter(
    (msg) =>
      msg.sender.toLowerCase().includes(search.toLowerCase()) ||
      msg.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Inbox</h2>
          <p className="text-xs text-slate-400">Manage incoming alerts, notifications, and client inquiries</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/40 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Message List */}
      <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-slate-950/20">
        {filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500">
            <Mail className="h-10 w-10 stroke-[1.2] mb-2" />
            <p className="text-xs">No messages match your search.</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              onClick={() => markRead(msg.id)}
              className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer hover:bg-white/5 ${
                msg.unread ? "bg-blue-600/5" : ""
              }`}
            >
              <div className="flex gap-3 min-w-0">
                {/* Actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStar(msg.id)
                  }}
                  className="mt-1"
                  title="Star message"
                >
                  <Star
                    className={`h-4.5 w-4.5 ${
                      msg.starred ? "fill-amber-400 text-amber-400" : "text-slate-500"
                    }`}
                  />
                </button>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${msg.unread ? "text-slate-100" : "text-slate-300"}`}>
                      {msg.sender}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        msg.tag === "Feedback"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : msg.tag === "Alert"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : msg.tag === "Billing"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {msg.tag}
                    </span>
                  </div>
                  <h4 className={`text-xs font-medium ${msg.unread ? "text-slate-200" : "text-slate-400"}`}>
                    {msg.subject}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{msg.preview}</p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 text-right">
                <span className="text-[10px] text-slate-500">{msg.time}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMessage(msg.id)
                  }}
                  title="Delete message"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-1 text-slate-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
