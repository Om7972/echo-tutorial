"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useUser, SignOutButton } from "@clerk/nextjs"
import {
  Sparkles,
  Bot,
  Zap,
  Shield,
  Activity,
  ArrowRight,
  Check,
  MessageSquare,
  Globe,
  Terminal,
  Code,
  Copy,
  ExternalLink,
  Database,
  Volume2,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
} from "lucide-react"

export default function LandingPage() {
  const { isSignedIn, user } = useUser()
  
  // Customizer state for demo widget
  const [widgetColor, setWidgetColor] = useState<"blue" | "emerald" | "violet" | "rose">("blue")
  const [widgetTheme, setWidgetTheme] = useState<"dark" | "light">("dark")
  const [widgetOrg, setWidgetOrg] = useState("Acme Support")
  const [copiedCode, setCopiedCode] = useState(false)
  const [scriptReloadKey, setScriptReloadKey] = useState(0)

  // Reload the support widget script when parameters change
  useEffect(() => {
    // 1. Remove any existing container or script
    const existingContainer = document.getElementById("echo-widget-container")
    if (existingContainer) {
      existingContainer.remove()
    }
    
    // 2. Clear initialization flag on window
    const win = window as any
    win.__ECHO_WIDGET_INITIALIZED__ = false
    
    // 3. Inject the widget script
    const script = document.createElement("script")
    
    // Resolve script URL based on current host (local vs deployed)
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
    script.src = `http://${host}:3001/widget.js`
    
    script.setAttribute("data-org-id", widgetOrg)
    script.setAttribute("data-color", widgetColor)
    script.setAttribute("data-theme", widgetTheme)
    script.async = true
    script.id = "echo-widget-embed-script"
    
    document.body.appendChild(script)

    return () => {
      script.remove()
      const container = document.getElementById("echo-widget-container")
      if (container) {
        container.remove()
      }
    }
  }, [widgetColor, widgetTheme, widgetOrg, scriptReloadKey])

  // Get active embed code snippet
  const embedCodeSnippet = `<script
  src="https://widget.echo.com/widget.js"
  data-org-id="${widgetOrg}"
  data-color="${widgetColor}"
  data-theme="${widgetTheme}"
  async
></script>`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-blue-500/20 selection:text-blue-200">
      {/* Decorative Grid and Blur Overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Top Banner decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/70 backdrop-blur-md transition-all">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">Echo Control</span>
              <span className="text-[10px] text-slate-500 font-semibold">Realtime Agent Portal</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
            <a href="#customizer" className="hover:text-slate-200 transition-colors">Live Customizer</a>
            <a href="#pricing" className="hover:text-slate-200 transition-colors">Pricing</a>
            <a href="https://convex.dev" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors flex items-center gap-1">
              <span>Database</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-xs font-semibold hover:bg-blue-500 transition-all shadow-md shadow-blue-500/10"
                >
                  Dashboard
                </Link>
                <SignOutButton>
                  <button className="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold hover:bg-slate-900 transition-all text-slate-400 hover:text-slate-200">
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-xs font-semibold hover:bg-blue-500 transition-all shadow-md shadow-blue-500/15"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-6">
        <div className="container mx-auto max-w-5xl text-center space-y-8 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs font-semibold tracking-wide animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Introducing Realtime AI Copilots & Voice Assistance</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Customer Support, Automated in{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              Realtime
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Integrate our premium support widget in 60 seconds. Empower customers with AI agents, KB suggestions, human handoff, and voice support, backed by a real-time SaaS control center.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>{isSignedIn ? "Go to Dashboard" : "Start Deploying Free"}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <a
              href="#customizer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Configure Live Demo</span>
            </a>
          </div>

          {/* Dashboard Preview / Mockup */}
          <div className="pt-16 max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-35 transition duration-500" />
            <div className="relative border border-slate-800 bg-slate-950/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
              {/* Mock Window Header */}
              <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-md border border-slate-850">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>echo-dashboard.local - Connected via Convex</span>
                </div>
                <div className="w-16" />
              </div>
              {/* Mock Content */}
              <div className="p-4 grid grid-cols-3 gap-4 text-left">
                {/* Mock Column 1: Conversations */}
                <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-3 space-y-3">
                  <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                    <span>Active Queues</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-lg space-y-1">
                      <span className="text-[10px] font-bold block text-blue-400">Visitor-5829</span>
                      <p className="text-[9px] text-slate-400 truncate">How do I setup Convex schemas?</p>
                    </div>
                    <div className="border border-slate-900 p-2 rounded-lg space-y-1 opacity-70">
                      <span className="text-[10px] font-bold block text-violet-400">Visitor-1039</span>
                      <p className="text-[9px] text-slate-400 truncate">Vapi connection timed out</p>
                    </div>
                  </div>
                </div>
                {/* Mock Column 2: Chat View */}
                <div className="col-span-2 border border-slate-900 bg-slate-950/40 rounded-xl p-3 flex flex-col justify-between min-h-[160px]">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[11px] font-bold">Chatting with Visitor-5829</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                      AI Agent Active
                    </span>
                  </div>
                  <div className="space-y-2 py-3 flex-1 text-[10px]">
                    <div className="bg-slate-900/60 p-2 rounded-lg max-w-[80%]">
                      Can I configure custom webhook triggers on resolve_ticket?
                    </div>
                    <div className="bg-blue-600/10 border border-blue-500/10 p-2 rounded-lg max-w-[85%] ml-auto text-blue-200">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                        <span>Claude-3.5-Sonnet (Agent)</span>
                      </div>
                      Yes! Resolving a ticket triggers `resolve_ticket()` in Convex which emits a mutation sync.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE CUSTOMIZER INTERACTIVE DEMO ─── */}
      <section id="customizer" className="py-20 px-6 border-y border-slate-900 bg-slate-950/40 relative">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left Controls */}
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Test the Live Theme Engine
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Customize the support widget branding colors and dark mode in real-time. Notice how the floating widget launcher in the bottom-right updates instantly!
                </p>
              </div>

              {/* Input for Org */}
              <div className="space-y-2">
                <label htmlFor="org-display-name-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Organization Display Name
                </label>
                <input
                  id="org-display-name-input"
                  type="text"
                  value={widgetOrg}
                  onChange={(e) => setWidgetOrg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Color Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Theme Brand Color
                </label>
                <div className="flex gap-3">
                  {(["blue", "emerald", "violet", "rose"] as const).map((col) => {
                    const colorClasses = {
                      blue: "bg-blue-600 ring-blue-500",
                      emerald: "bg-emerald-600 ring-emerald-500",
                      violet: "bg-violet-600 ring-violet-500",
                      rose: "bg-rose-600 ring-rose-500",
                    }
                    const isSelected = widgetColor === col
                    return (
                      <button
                        key={col}
                        onClick={() => setWidgetColor(col)}
                        className={`w-9 h-9 rounded-xl ${colorClasses[col]} transition-all cursor-pointer ${
                          isSelected ? "ring-4 ring-offset-4 ring-offset-slate-950 scale-110" : "opacity-70 hover:opacity-100"
                        }`}
                        title={`Select ${col}`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Dark/Light Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Widget Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["dark", "light"] as const).map((mode) => {
                    const isSelected = widgetTheme === mode
                    return (
                      <button
                        key={mode}
                        onClick={() => setWidgetTheme(mode)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer capitalize ${
                          isSelected
                            ? "bg-slate-800 border-blue-500 text-white"
                            : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        {mode} Mode
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Info Alert */}
              <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 text-blue-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The floating widget launcher is active in the bottom-right. Click it to explore screen routers, suggestions, and human handoff!
                </span>
              </div>
            </div>

            {/* Right Embed Code Card */}
            <div className="border border-slate-800 bg-slate-950/80 rounded-2xl overflow-hidden shadow-xl text-left">
              <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-blue-400" />
                  <span>One-Click Integration Script</span>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-850 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-slate-200 font-semibold transition-all flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Embed</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-5 font-mono text-[11px] text-slate-300 overflow-x-auto bg-slate-950/90 leading-relaxed whitespace-pre select-all">
                {embedCodeSnippet}
              </div>
              <div className="p-4 border-t border-slate-900 bg-slate-900/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-200">Iframe & CSP Compliant</span>
                  <span className="text-[9px] text-slate-500 font-semibold">Loads asynchronously without blocking web page layout render</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="container mx-auto max-w-5xl space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              State-of-the-Art Feature Stack
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Engineered end-to-end for production deployment, built with top-tier technologies.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">AI Agent Architecture</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamlessly powered by OpenAI, Claude, or Grok. Incorporates full context memory, summaries, and agent reasoning.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Convex Realtime DB</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic subscription synchronization for conversations, typing statuses, reactions, and visitor session history.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Voice & Suggestions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Includes full Voice support assistant routing and real-time knowledge base lookup for immediate help.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Session Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Persistent anonymous visitor profiles, session cookie fallback, automatic history reconnect, and status sync.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Theme & Widget Router</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fluid screen transition routers (Home, Inbox, Voice, KB, Handoff) with support for customized branding styles.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="border border-slate-900 bg-slate-950/60 p-5 rounded-2xl space-y-3 hover:border-slate-800 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Production Guardrails</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero-bug TypeScript builds, Sentry-instrumented client/server error boundaries, and Clerk authentication.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── PRICING PLANS ─── */}
      <section id="pricing" className="py-20 px-6 bg-slate-950/40 border-t border-slate-900 relative">
        <div className="container mx-auto max-w-5xl space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Flexible Pricing Tiers
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Start for free, upgrade as your support queues grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            
            {/* Plan 1 */}
            <div className="border border-slate-900 bg-slate-950/60 p-6 rounded-2xl flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Developer</span>
                  <h3 className="text-xl font-bold text-white mt-1">Free</h3>
                </div>
                <div className="text-2xl font-black text-white">
                  $0 <span className="text-xs font-semibold text-slate-500">/ mo</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Best for small projects and local testing.
                </p>
                <div className="border-t border-slate-900 my-4" />
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Up to 100 sessions / mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>OpenAI API Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Convex database schema</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/sign-up"
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-800 text-center text-xs font-semibold hover:bg-slate-900 transition-all text-slate-200"
              >
                Start Free
              </Link>
            </div>

            {/* Plan 2: Featured */}
            <div className="border-2 border-blue-600 bg-slate-950/90 p-6 rounded-2xl flex flex-col justify-between relative text-left shadow-lg shadow-blue-600/10">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider">
                Popular
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">Growth</span>
                  <h3 className="text-xl font-bold text-white mt-1">Startup</h3>
                </div>
                <div className="text-2xl font-black text-white">
                  $49 <span className="text-xs font-semibold text-slate-500">/ mo</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Perfect for growing business queues requiring custom tools.
                </p>
                <div className="border-t border-slate-900 my-4" />
                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Unlimited sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Claude + OpenAI providers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Custom KB search tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Branding widget customizer</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/sign-up"
                className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 text-center text-xs font-bold hover:bg-blue-500 transition-all text-white shadow-md shadow-blue-500/10"
              >
                Deploy Now
              </Link>
            </div>

            {/* Plan 3 */}
            <div className="border border-slate-900 bg-slate-950/60 p-6 rounded-2xl flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Scale</span>
                  <h3 className="text-xl font-bold text-white mt-1">Enterprise</h3>
                </div>
                <div className="text-2xl font-black text-white">
                  Custom
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Designed for high-scale enterprise service levels.
                </p>
                <div className="border-t border-slate-900 my-4" />
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>SLA-backed human handoff</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Grok integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span>Custom domain widgets</span>
                  </li>
                </ul>
              </div>
              <a
                href="mailto:sales@echo.com"
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-800 text-center text-xs font-semibold hover:bg-slate-900 transition-all text-slate-200"
              >
                Contact Sales
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-900 py-12 px-6 bg-slate-950 text-center relative z-10 text-xs text-slate-500">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">E</span>
            <span className="font-bold text-slate-300">Echo Control</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Echo Control Inc. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Clerk Auth</a>
            <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">Sentry telemetry</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
