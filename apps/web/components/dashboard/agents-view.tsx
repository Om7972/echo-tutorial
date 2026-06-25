// @ts-nocheck
"use client"

import { useState } from "react"
import { Bot, Plus, ToggleLeft, ToggleRight, Sparkles } from "lucide-react"

interface Agent {
  id: string
  name: string
  provider: string
  model: string
  status: "active" | "inactive"
  calls: number
}

const mockAgents: Agent[] = [
  { id: "1", name: "Support AI Bot", provider: "openai", model: "gpt-4o-mini", status: "active", calls: 4120 },
  { id: "2", name: "Outbound Sales Rep", provider: "anthropic", model: "claude-3-5-sonnet", status: "active", calls: 1890 },
  { id: "3", name: "Grok Custom Concierge", provider: "grok", model: "grok-beta", status: "inactive", calls: 240 },
]

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a
      )
    )
  }

  const handleAddAgent = () => {
    const newAgent: Agent = {
      id: String(agents.length + 1),
      name: "New Voice Agent Pro",
      provider: "openai",
      model: "gpt-4o",
      status: "active",
      calls: 0,
    }
    setAgents([...agents, newAgent])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI Agents</h2>
          <p className="text-xs text-slate-400">Configure and orchestrate LLM-powered custom voice bots</p>
        </div>

        <button
          onClick={handleAddAgent}
          className="flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((a) => (
          <div
            key={a.id}
            className="p-5 border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md flex flex-col justify-between h-[190px] hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{a.name}</h4>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">{a.model}</span>
                </div>
              </div>

              {/* Status Toggle Icon */}
              <button onClick={() => toggleAgent(a.id)} className="text-slate-400 hover:text-slate-200">
                {a.status === "active" ? (
                  <ToggleRight className="w-9 h-9 text-emerald-500 stroke-[1.5]" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600 stroke-[1.5]" />
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Total Calls</span>
                <span className="text-sm font-bold text-slate-200">{a.calls}</span>
              </div>

              <span
                className={`text-[9px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${
                  a.provider === "openai"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : a.provider === "anthropic"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                }`}
              >
                {a.provider}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
