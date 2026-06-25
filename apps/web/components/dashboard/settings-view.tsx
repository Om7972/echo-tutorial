// @ts-nocheck
"use client"

import { useState } from "react"
import { Settings, Save, Key, Globe, Eye, EyeOff } from "lucide-react"

export function SettingsView() {
  const [orgName, setOrgName] = useState("Acme Labs Inc.")
  const [webhook, setWebhook] = useState("https://api.acme.com/voice-events")
  const [apiKey, setApiKey] = useState("sk_vapi_live_4a1c5d6e...")
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Organization Settings</h2>
          <p className="text-xs text-slate-400">Configure global voice parameters, API access, and webhooks</p>
        </div>
      </div>

      <div className="max-w-2xl border border-white/5 rounded-2xl bg-slate-950/20 divide-y divide-white/5 overflow-hidden">
        {/* Profile Settings */}
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            General Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="orgName" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Organization Name</label>
              <input
                id="orgName"
                type="text"
                placeholder="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full pl-3.5 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">System Timezone</label>
              <select id="timezone" title="System Timezone" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none">
                <option>UTC (Coordinated Universal Time)</option>
                <option>EST (Eastern Standard Time)</option>
                <option>PST (Pacific Standard Time)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Developer Keys */}
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            API & Credentials
          </h3>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="webhook" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Vapi webhook endpoint</label>
              <input
                id="webhook"
                type="text"
                placeholder="Webhook URL"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                className="w-full pl-3.5 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="apiKey" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Echo developer secret key</label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "Hide Key" : "Show Key"}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="p-4 bg-slate-950/40 flex justify-end">
          <button className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-colors">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
