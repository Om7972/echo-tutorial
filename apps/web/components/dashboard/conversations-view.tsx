"use client"

import { useState } from "react"
import { Send, User, Bot, Search } from "lucide-react"

interface ChatMessage {
  sender: "user" | "assistant"
  text: string
  time: string
}

interface ChatSession {
  id: string
  name: string
  avatar: string
  lastMsg: string
  active: boolean
  messages: ChatMessage[]
}

const mockSessions: ChatSession[] = [
  {
    id: "1",
    name: "Acme Corp Admin",
    avatar: "A",
    lastMsg: "Will check the dashboard logs right now.",
    active: true,
    messages: [
      { sender: "user", text: "Hey! Can we look into connecting the Vapi widget?", time: "10:30 AM" },
      { sender: "assistant", text: "Sure! Let me fetch your Vapi public key variables from the config.", time: "10:31 AM" },
      { sender: "user", text: "Great, let me know if you need help.", time: "10:32 AM" },
      { sender: "assistant", text: "Will check the dashboard logs right now.", time: "10:33 AM" },
    ],
  },
  {
    id: "2",
    name: "FinTech Integration Support",
    avatar: "F",
    lastMsg: "Let's schedule a call tomorrow afternoon.",
    active: false,
    messages: [
      { sender: "user", text: "Hello team, we are facing 401 unauthenticated errors on webhook callbacks.", time: "Yesterday" },
      { sender: "assistant", text: "Let's schedule a call tomorrow afternoon.", time: "Yesterday" },
    ],
  },
]

export function ConversationsView() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions)
  const [activeId, setActiveId] = useState("1")
  const [input, setInput] = useState("")

  const activeSession = sessions.find((s) => s.id === activeId) || sessions[0]!

  const handleSendMessage = () => {
    if (!input.trim()) return

    const newMsg: ChatMessage = {
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              lastMsg: input,
              messages: [...s.messages, newMsg],
            }
          : s
      )
    )
    setInput("")

    // Simple auto-reply after 1.5s
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        sender: "assistant",
        text: "Thanks for the message! Our AI agents are currently compiling your request details.",
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                lastMsg: replyMsg.text,
                messages: [...s.messages, replyMsg],
              }
            : s
        )
      )
    }, 1500)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
      {/* Session List */}
      <div className="border border-white/5 rounded-2xl bg-slate-950/20 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/5 bg-slate-950/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chat list..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-xs placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                activeId === s.id ? "bg-blue-600/10 border-r-2 border-blue-500" : "hover:bg-white/5"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-300">
                {s.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{s.name}</h4>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{s.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Conversation Window */}
      <div className="md:col-span-2 border border-white/5 rounded-2xl bg-slate-950/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-200">
              {activeSession.avatar}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">{activeSession.name}</h3>
              <span className="text-[10px] text-emerald-400 font-medium">● Connected</span>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
          {activeSession.messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 text-xs leading-relaxed max-w-[80%] ${
                m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                  m.sender === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`px-3.5 py-2.5 rounded-2xl ${
                  m.sender === "user"
                    ? "bg-blue-600/10 border border-blue-500/20 text-slate-200 rounded-tr-none"
                    : "bg-slate-900/60 border border-white/5 text-slate-300 rounded-tl-none"
                }`}
              >
                <p>{m.text}</p>
                <span className="text-[9px] text-slate-500 block text-right mt-1">{m.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/5 flex gap-2 bg-slate-950/40">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage()
            }}
            className="flex-1 pl-3.5 pr-4 py-2 bg-slate-900/60 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
