"use client"

import { useState, useEffect } from "react"
import { 
  Code, Terminal, Key, Webhook, FileText, History, Gauge, 
  Server, Settings, Clipboard, Play, Send, Eye, EyeOff, 
  Plus, Trash2, HelpCircle, Check, ChevronRight, RefreshCw, Cpu
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts"

// Mock request logs
const initialLogs = [
  { id: "1", method: "POST", path: "/v1/conversations", status: 201, time: "12ms", timestamp: "Just now" },
  { id: "2", method: "GET", path: "/v1/agents", status: 200, time: "8ms", timestamp: "2 mins ago" },
  { id: "3", method: "POST", path: "/v1/messages", status: 200, time: "24ms", timestamp: "5 mins ago" },
  { id: "4", method: "POST", path: "/v1/webhooks/test", status: 500, time: "180ms", timestamp: "12 mins ago" },
  { id: "5", method: "GET", path: "/v1/conversations/conv_9a2", status: 200, time: "5ms", timestamp: "30 mins ago" },
]

// Mock API keys
const initialKeys = [
  { id: "1", name: "Production Key", token: "sk_live_51Nv...a8f2", created: "2026-04-12" },
  { id: "2", name: "Sandbox/Test Key", token: "sk_test_51Nv...90bc", created: "2026-05-18" },
]

// Usage chart data
const usageData = [
  { name: "Mon", calls: 120, errors: 2 },
  { name: "Tue", calls: 180, errors: 4 },
  { name: "Wed", calls: 290, errors: 10 },
  { name: "Thu", calls: 240, errors: 5 },
  { name: "Fri", calls: 350, errors: 8 },
  { name: "Sat", calls: 190, errors: 1 },
  { name: "Sun", calls: 210, errors: 0 },
]

// Webhook events
const webhookEvents = [
  { id: "msg_sent", label: "message.sent", description: "Triggered when a new message is received or sent." },
  { id: "conv_escalated", label: "conversation.escalated", description: "Triggered when a chat is transferred or escalates to humans." },
  { id: "conv_resolved", label: "conversation.resolved", description: "Triggered when a conversation is marked resolved." },
]

export function DeveloperView() {
  const [activeSubTab, setActiveSubTab] = useState<"keys" | "webhooks" | "docs" | "logs" | "playground">("keys")
  
  // API Keys States
  const [apiKeys, setApiKeys] = useState(initialKeys)
  const [newKeyName, setNewKeyName] = useState("")
  const [showKeyId, setShowKeyId] = useState<string | null>(null)
  
  // Embed Script States
  const [embedScriptCopied, setEmbedScriptCopied] = useState(false)
  const [widgetId, setWidgetId] = useState("wdgt_echo_prod_771a2")

  // Webhooks States
  const [webhookUrl, setWebhookUrl] = useState("https://api.yourdomain.com/v1/webhooks")
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["msg_sent"])
  const [webhookSecret, setWebhookSecret] = useState("whsec_a8b9c2d1e0f34567")
  const [testPayloadResult, setTestPayloadResult] = useState<string | null>(null)
  const [testingWebhook, setTestingWebhook] = useState(false)

  // API Playground States
  const [selectedMethod, setSelectedMethod] = useState<"GET" | "POST" | "DELETE">("GET")
  const [selectedPath, setSelectedPath] = useState("/v1/conversations")
  const [requestBody, setRequestBody] = useState(`{\n  "visitorId": "visitor_129",\n  "initialMessage": "Hello support!"\n}`)
  const [responseOutput, setResponseOutput] = useState<string | null>(null)
  const [executingPlayground, setExecutingPlayground] = useState(false)

  // SDK Docs state
  const [selectedSdk, setSelectedSdk] = useState<"js" | "python" | "curl">("js")

  // Rate Limits state
  const [rateLimitValue, setRateLimitValue] = useState(72) // 72% used

  // Env Vars state
  const [envVars, setEnvVars] = useState({
    OPENAI_API_KEY: "sk-proj-••••••••••••••••3A1B",
    ANTHROPIC_API_KEY: "sk-ant-••••••••••••••••8F9A",
    CLERK_SECRET_KEY: "sk_test_••••••••••••••••C2E4",
  })
  const [editingEnv, setEditingEnv] = useState<string | null>(null)
  const [envInputVal, setEnvInputVal] = useState("")

  const copyToClipboard = (text: string, setCopied: (b: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    const randomHex = Math.random().toString(16).substring(2, 10)
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      token: `sk_live_51Nv...${randomHex}`,
      created: new Date().toISOString().split("T")[0]!,
    }
    setApiKeys([...apiKeys, newKey])
    setNewKeyName("")
  }

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id))
  }

  const handleTestWebhook = async () => {
    setTestingWebhook(true)
    setTestPayloadResult(null)
    // Simulate API delivery delay
    setTimeout(() => {
      setTestingWebhook(false)
      setTestPayloadResult(JSON.stringify({
        status: 200,
        delivery_id: "dlv_9b3c1a8f",
        delivered_at: new Date().toISOString(),
        payload_echo: {
          event: "message.sent",
          data: {
            conversationId: "conv_71ac8a",
            message: "Hello world via webhook test!",
            senderType: "visitor"
          }
        }
      }, null, 2))
    }, 1200)
  }

  const handleRunPlayground = () => {
    setExecutingPlayground(true)
    setResponseOutput(null)
    setTimeout(() => {
      setExecutingPlayground(false)
      if (selectedPath === "/v1/conversations") {
        if (selectedMethod === "GET") {
          setResponseOutput(JSON.stringify([
            { id: "conv_1", orgId: "demo-org", status: "active", createdAt: Date.now() - 3600000 },
            { id: "conv_2", orgId: "demo-org", status: "resolved", createdAt: Date.now() - 7200000 }
          ], null, 2))
        } else if (selectedMethod === "POST") {
          try {
            const parsed = JSON.parse(requestBody)
            setResponseOutput(JSON.stringify({
              id: "conv_new_881",
              status: "active",
              visitorId: parsed.visitorId || "unknown",
              createdAt: Date.now(),
              lastMessageText: parsed.initialMessage || ""
            }, null, 2))
          } catch(e) {
            setResponseOutput(JSON.stringify({ error: "Invalid JSON request body" }, null, 2))
          }
        } else {
          setResponseOutput(JSON.stringify({ error: "Method not supported on this endpoint" }, null, 2))
        }
      } else if (selectedPath === "/v1/agents") {
        setResponseOutput(JSON.stringify([
          { id: "agent_1", name: "Support Copilot", provider: "openai", model: "gpt-4o" },
          { id: "agent_2", name: "Voice Support AI", provider: "anthropic", model: "claude-3-5-sonnet" }
        ], null, 2))
      } else {
        setResponseOutput(JSON.stringify({ message: "Success", timestamp: Date.now() }, null, 2))
      }
    }, 1000)
  }

  const embedScriptCode = `<script>
  (function(w,d,s,o,f,js,fjs){
    w['EchoWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id='echo-widget-sdk';js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','echo','http://localhost:3001/embed.js'));
  
  echo('init', { widgetId: '${widgetId}' });
</` + `script>`

  return (
    <div className="space-y-6">
      {/* Dev Portal Header with Quick Diagnostics */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            Developer Portal & Sandbox
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Build custom automation workflows, configure outgoing webhooks, grab API keys, and test widget embed tokens.
          </p>
        </div>

        {/* Global Developer Sandbox Switch / Env variables */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider">Sandbox Environment</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Panel Selection */}
      <div className="flex border-b border-white/5 gap-1.5 pb-px overflow-x-auto">
        {[
          { id: "keys", label: "API Keys & Embed", icon: Key },
          { id: "webhooks", label: "Webhooks Settings", icon: Webhook },
          { id: "docs", label: "SDK Documentation", icon: FileText },
          { id: "logs", label: "API Request Logs", icon: History },
          { id: "playground", label: "API Playground", icon: Play },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isActive 
                  ? "border-blue-500 text-slate-200" 
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:border-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* MAIN VIEW CONTENTS CONTAINER */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Main Tab Content */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* TAB 1: API KEYS & WIDGET EMBED */}
          {activeSubTab === "keys" && (
            <div className="space-y-6">
              {/* API Keys Table */}
              <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    Authentication Keys
                  </h3>
                </div>

                <div className="space-y-3">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/3 border border-white/5 gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{k.name}</h4>
                        <span className="text-[10px] text-slate-500 block mt-1">Created on {k.created}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg text-slate-400">
                          {showKeyId === k.id ? k.token : "••••••••••••••••••••"}
                        </div>
                        <button
                          onClick={() => setShowKeyId(showKeyId === k.id ? null : k.id)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200"
                          title="Show/Hide Key"
                        >
                          {showKeyId === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create Key Form */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Key name (e.g. Server Production)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5 text-slate-200 outline-none focus:border-blue-500/40"
                  />
                  <button
                    onClick={handleCreateKey}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    New API Key
                  </button>
                </div>
              </div>

              {/* Generate Embed Script */}
              <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-blue-500" />
                    Chat Widget Embed Integration
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Copy and paste the generated bootstrap SDK script below into the `<head>` or `<body>` element of your HTML pages.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Widget Token:</span>
                  <input
                    type="text"
                    value={widgetId}
                    onChange={(e) => setWidgetId(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-semibold text-slate-250 border-none outline-none"
                  />
                </div>

                <div className="relative rounded-xl bg-slate-900/90 border border-white/10 p-4 font-mono text-[10px] text-slate-300 leading-relaxed overflow-x-auto">
                  <button
                    onClick={() => copyToClipboard(embedScriptCode, setEmbedScriptCopied)}
                    className="absolute top-3 right-3 flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 transition-all text-[9px] font-bold cursor-pointer"
                  >
                    {embedScriptCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    {embedScriptCopied ? "Copied" : "Copy"}
                  </button>
                  <pre className="whitespace-pre">{embedScriptCode}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEBHOOK SETTINGS */}
          {activeSubTab === "webhooks" && (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-5">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                  <Webhook className="w-4 h-4 text-emerald-400" />
                  Outgoing Webhooks
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Echo will dispatch HTTP POST requests to your server endpoint when system events trigger.
                </p>
              </div>

              {/* Webhook Endpoint Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Endpoint URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-slate-200 outline-none focus:border-blue-500/40"
                  placeholder="https://api.yourdomain.com/v1/webhooks"
                />
              </div>

              {/* Event Subscriptions checkboxes */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Subscribe to Events</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {webhookEvents.map((evt) => {
                    const isChecked = selectedEvents.includes(evt.id)
                    return (
                      <div
                        key={evt.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedEvents(selectedEvents.filter(x => x !== evt.id))
                          } else {
                            setSelectedEvents([...selectedEvents, evt.id])
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked 
                            ? "bg-blue-600/10 border-blue-500/30" 
                            : "bg-white/3 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{evt.label}</span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isChecked ? "bg-blue-500 border-blue-500 text-white" : "border-slate-500"
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1.5 leading-normal">{evt.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Signature Secret */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Signing Secret</span>
                  <span className="text-xs font-mono text-slate-350 block mt-1">{webhookSecret}</span>
                </div>
                <button
                  onClick={() => setWebhookSecret(`whsec_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`)}
                  className="flex items-center gap-1 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 animate-[spin_3s_linear_infinite]" />
                  Rotate
                </button>
              </div>

              {/* Webhook Delivery Tester */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-350">Deliver Mock Test Payload</h4>
                  <button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingWebhook ? "Sending..." : "Test Endpoint"}
                  </button>
                </div>

                {testPayloadResult && (
                  <pre className="rounded-xl bg-slate-900 p-4 font-mono text-[9px] text-emerald-400 overflow-x-auto border border-emerald-500/10">
                    {testPayloadResult}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SDK DOCUMENTATION */}
          {activeSubTab === "docs" && (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  SDK Docs & Reference
                </h3>

                {/* Sdk Language switches */}
                <div className="flex bg-slate-900 border border-white/5 p-1 rounded-lg">
                  {[
                    { id: "js", label: "Node.js" },
                    { id: "python", label: "Python" },
                    { id: "curl", label: "cURL" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSdk(s.id as any)}
                      className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        selectedSdk === s.id 
                          ? "bg-blue-600 text-white" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Panel Display */}
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-900 p-4 font-mono text-[10px] text-slate-300 leading-relaxed border border-white/5 overflow-x-auto">
                  {selectedSdk === "js" && (
                    <pre>{`// 1. Install SDK
npm install @echo-ai/node

// 2. Initialize and send message
import { EchoClient } from "@echo-ai/node";

const client = new EchoClient({
  apiKey: "YOUR_API_KEY",
});

const response = await client.messages.create({
  conversationId: "conv_7a8b9c",
  senderId: "customer_user_99",
  senderName: "OM Dev",
  content: "I need technical support with my subscription billing.",
  type: "text"
});

console.log("Response delivered:", response.id);`}</pre>
                  )}

                  {selectedSdk === "python" && (
                    <pre>{`# 1. Install package
pip install echo-ai-sdk

# 2. Trigger conversations creation
from echo import EchoClient

client = EchoClient(api_key="YOUR_API_KEY")

conversation = client.conversations.create(
    visitor_id="visitor_992",
    tags=["billing", "enterprise"]
)

print(f"Created Conversation: {conversation.id}")`}</pre>
                  )}

                  {selectedSdk === "curl" && (
                    <pre>{`curl -X POST "http://localhost:3000/api/v1/messages" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "conversationId": "conv_71ac8a",
    "content": "Hello support via API call!",
    "senderType": "visitor"
  }'`}</pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: API REQUEST LOGS */}
          {activeSubTab === "logs" && (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-400" />
                  API Event Logs
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  History of incoming HTTP endpoints calls and system executions.
                </p>
              </div>

              <div className="divide-y divide-white/5">
                {initialLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs font-semibold gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        log.method === "POST" ? "bg-blue-500/10 text-blue-450" : "bg-emerald-500/10 text-emerald-450"
                      }`}>
                        {log.method}
                      </span>
                      <span className="font-mono text-slate-300">{log.path}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{log.time}</span>
                      <span className={`text-[10px] font-bold ${
                        log.status === 200 || log.status === 201 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: API PLAYGROUND */}
          {activeSubTab === "playground" && (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-5">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-amber-500" />
                  Live API Playground
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Directly dispatch HTTP calls against sandbox resources and inspect headers/JSON bodies.
                </p>
              </div>

              {/* Endpoint configuration panel */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Method selector */}
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value as any)}
                  className="bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-slate-350"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>

                {/* Path input selector */}
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-slate-350"
                >
                  <option value="/v1/conversations">/v1/conversations</option>
                  <option value="/v1/agents">/v1/agents</option>
                  <option value="/v1/messages">/v1/messages</option>
                </select>

                {/* Execute button */}
                <button
                  onClick={handleRunPlayground}
                  disabled={executingPlayground}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {executingPlayground ? "Running..." : "Run"}
                </button>
              </div>

              {/* Request JSON Body editor */}
              {selectedMethod === "POST" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Request Body (JSON)</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={4}
                    className="w-full font-mono text-xs p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-slate-200 outline-none focus:border-blue-500/40"
                  />
                </div>
              )}

              {/* Response Panel */}
              {responseOutput && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Response Output</label>
                  <pre className="rounded-xl bg-slate-900 p-4 font-mono text-[9px] text-slate-300 border border-white/5 overflow-x-auto max-h-[300px]">
                    {responseOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Col: Developer Diagnostics Sidebar */}
        <div className="space-y-6">
          
          {/* Rate Limits Quota Panel */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Gauge className="w-4 h-4 text-blue-450" />
              API Quota & Limits
            </h3>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-450">Rate Limit</span>
                  <span className="text-slate-300">72 / 100 reqs/min</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-white/5">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "72%" }} />
                </div>
              </div>

              <div className="space-y-1 text-[10px] text-slate-500 font-semibold leading-relaxed">
                <div className="flex justify-between border-b border-white/3 pb-1">
                  <span>Burst Allowance:</span>
                  <span className="text-slate-350 font-bold">120 requests</span>
                </div>
                <div className="flex justify-between border-b border-white/3 pt-1 pb-1">
                  <span>Monthly Quota:</span>
                  <span className="text-slate-350 font-bold">84k / 100k requests</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Reset Countdown:</span>
                  <span className="text-slate-350 font-bold">8 days 2 hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Analytics API (Recharts Area chart) */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-3">
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Server className="w-4 h-4 text-emerald-450" />
              Usage Analytics
            </h3>

            <div className="h-[120px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={8} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={8} />
                  <Tooltip />
                  <Area type="monotone" name="API Calls" dataKey="calls" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Environment Variables settings */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-350 flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Cpu className="w-4 h-4 text-purple-400" />
              Environment Config
            </h3>

            <div className="space-y-3">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="space-y-1 p-2 bg-slate-900 border border-white/3 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] font-black text-slate-400">{key}</span>
                    <button
                      onClick={() => {
                        if (editingEnv === key) {
                          setEnvVars({ ...envVars, [key]: envInputVal })
                          setEditingEnv(null)
                        } else {
                          setEditingEnv(key)
                          setEnvInputVal("")
                        }
                      }}
                      className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      {editingEnv === key ? "Save" : "Change"}
                    </button>
                  </div>
                  
                  {editingEnv === key ? (
                    <input
                      type="password"
                      value={envInputVal}
                      onChange={(e) => setEnvInputVal(e.target.value)}
                      placeholder="Enter new key value"
                      className="w-full text-[10px] font-mono px-2 py-1 rounded bg-slate-950 border border-white/5 text-slate-300 outline-none"
                    />
                  ) : (
                    <div className="font-mono text-[10px] text-slate-300 truncate">{value}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
