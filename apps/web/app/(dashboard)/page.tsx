"use client"

/**
 * Premium B2B SaaS Dashboard
 *
 * Implements a fully responsive sidebar + navbar panel system featuring:
 * - Collapsible navigation sidebar.
 * - Tabbed page contents (Inbox, Conversations, KB, AI Agents, Analytics, Team, Billing, Settings).
 * - Organization switcher, notifications list, profile menu, and dark/light theme toggler.
 * - Keyboard shortcuts (e.g., [ to collapse sidebar, g+i to navigate to Inbox, etc.).
 * - Simulated async loading skeletons during transitions.
 */

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"

import {
  Inbox,
  MessageSquare,
  BookOpen,
  Bot,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  Menu,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Keyboard,
  Building,
  CheckCircle,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"

// Import views
import { InboxView } from "@/components/dashboard/inbox-view"
import { ConversationsView } from "@/components/dashboard/conversations-view"
import { KBView } from "@/components/dashboard/kb-view"
import { AgentsView } from "@/components/dashboard/agents-view"
import { AnalyticsView } from "@/components/dashboard/analytics-view"
import { TeamView } from "@/components/dashboard/team-view"
import { BillingView } from "@/components/dashboard/billing-view"
import { SettingsView } from "@/components/dashboard/settings-view"

// Import skeletons
import { TableSkeleton, GridSkeleton, ChatSkeleton } from "@/components/dashboard/loading-skeletons"

// Import Shadcn/Radix components
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui/components/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/tooltip"
import { Separator } from "@workspace/ui/components/separator"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

type ActiveTab =
  | "inbox"
  | "conversations"
  | "kb"
  | "agents"
  | "analytics"
  | "team"
  | "billing"
  | "settings"

interface SidebarItem {
  id: ActiveTab
  label: string
  icon: React.ComponentType<any>
  shortcut: string
}

const sidebarItems: SidebarItem[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, shortcut: "G + I" },
  { id: "conversations", label: "Conversations", icon: MessageSquare, shortcut: "G + C" },
  { id: "kb", label: "Knowledge Base", icon: BookOpen, shortcut: "G + K" },
  { id: "agents", label: "AI Agents", icon: Bot, shortcut: "G + A" },
  { id: "analytics", label: "Analytics", icon: BarChart3, shortcut: "G + Y" },
  { id: "team", label: "Team", icon: Users, shortcut: "G + T" },
  { id: "billing", label: "Billing", icon: CreditCard, shortcut: "G + B" },
  { id: "settings", label: "Settings", icon: Settings, shortcut: "G + S" },
]

export default function DashboardPage() {
  const { user } = useUser()

  // State Variables
  const [activeTab, setActiveTab] = useState<ActiveTab>("inbox")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [org, setOrg] = useState("Acme Labs Inc.")
  const [unreadNotifications, setUnreadNotifications] = useState(3)

  // Ref to track keyboard sequence
  const lastKeyRef = useRef<string | null>(null)

  // Sync state changes with brief loading skeletons to feel active/dynamic
  const handleTabChange = (tabId: ActiveTab) => {
    setIsLoading(true)
    setActiveTab(tabId)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 450)
    return () => clearTimeout(timer)
  }

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts if inside text input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Toggle Sidebar Collapse using "["
      if (key === "[") {
        e.preventDefault()
        setSidebarCollapsed((prev) => !prev)
        return
      }

      // Check double-key shortcuts starting with "g"
      if (lastKeyRef.current === "g") {
        let matched = true
        switch (key) {
          case "i":
            handleTabChange("inbox")
            break
          case "c":
            handleTabChange("conversations")
            break
          case "k":
            handleTabChange("kb")
            break
          case "a":
            handleTabChange("agents")
            break
          case "y":
            handleTabChange("analytics")
            break
          case "t":
            handleTabChange("team")
            break
          case "b":
            handleTabChange("billing")
            break
          case "s":
            handleTabChange("settings")
            break
          default:
            matched = false
        }
        if (matched) {
          e.preventDefault()
          lastKeyRef.current = null
          return
        }
      }

      // Store "g" key as active prefix
      if (key === "g") {
        lastKeyRef.current = "g"
        // Reset prefix after 800ms
        setTimeout(() => {
          lastKeyRef.current = null
        }, 800)
      }
    };

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, []);

  // Theme is managed by ThemeProvider — no manual sync needed here

  // Render view template depending on selected tab
  const renderActiveView = () => {
    if (isLoading) {
      if (activeTab === "inbox" || activeTab === "kb" || activeTab === "team" || activeTab === "billing") {
        return <TableSkeleton />
      }
      if (activeTab === "agents" || activeTab === "analytics") {
        return <GridSkeleton />
      }
      if (activeTab === "conversations") {
        return <ChatSkeleton />
      }
      return <TableSkeleton />
    }

    switch (activeTab) {
      case "inbox":
        return <InboxView />
      case "conversations":
        return <ConversationsView />
      case "kb":
        return <KBView />
      case "agents":
        return <AgentsView />
      case "analytics":
        return <AnalyticsView />
      case "team":
        return <TeamView />
      case "billing":
        return <BillingView />
      case "settings":
        return <SettingsView />
      default:
        return <InboxView />
    }
  }

  // Get active item display metadata
  const activeItem = sidebarItems.find((item) => item.id === activeTab) || sidebarItems[0]!

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 light:bg-slate-50 light:text-slate-900 transition-colors duration-200">
        
        {/* ─── DESKTOP & TABLET SIDEBAR ─── */}
        <aside
          className={`hidden md:flex flex-col border-r border-white/5 bg-slate-950 transition-all duration-300 relative ${
            sidebarCollapsed ? "w-[72px]" : "w-64"
          }`}
        >
          {/* Logo / Header */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
              E
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold tracking-tight truncate">Echo Control</span>
                <span className="text-[10px] text-slate-500 font-semibold truncate">Enterprise SaaS</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isSelected = activeTab === item.id

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.id} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full h-11 flex items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-3 bg-slate-900 border border-white/10 text-slate-200">
                      <span>{item.label}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {item.shortcut}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full h-11 flex items-center justify-between px-3 rounded-xl transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <span className="text-[9px] opacity-60 font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-white/5">
                    {item.shortcut}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Sidebar footer collapse control */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Press [ to collapse</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 rounded-lg border border-white/5 hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 mx-auto"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* ─── MAIN PORTAL VIEW CONTAINER ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* ─── TOP NAVBAR ─── */}
          <header className="h-16 border-b border-white/5 flex items-center justify-between px-5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-4">
              
              {/* MOBILE SIDEBAR SHEET TRIGGER */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="md:hidden p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-slate-950 p-0 border-r border-white/5">
                  <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white">
                      E
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-tight">Echo Control</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Enterprise SaaS</span>
                    </div>
                  </div>
                  <nav className="py-4 px-3 space-y-1.5">
                    {sidebarItems.map((item) => {
                      const Icon = item.icon
                      const isSelected = activeTab === item.id

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleTabChange(item.id)
                          }}
                          className={`w-full h-11 flex items-center gap-3 px-3 rounded-xl transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          <span className="text-xs font-semibold">{item.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* ORGANIZATION SWITCHER DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 hover:bg-white/5 transition-colors text-xs font-semibold text-slate-200">
                    <Building className="w-3.5 h-3.5 text-blue-400" />
                    <span>{org}</span>
                    <ChevronRight className="w-3 h-3 rotate-90 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-slate-900 border border-white/10 text-slate-200">
                  <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-slate-500">
                    Select Org
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  {["Acme Labs Inc.", "Globex Systems", "Initech Corp"].map((o) => (
                    <DropdownMenuItem
                      key={o}
                      onClick={() => setOrg(o)}
                      className="text-xs focus:bg-white/5 focus:text-white cursor-pointer"
                    >
                      {o}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* RIGHT HEADER ACTIONS */}
            <div className="flex items-center gap-3">
              
              {/* THEME TOGGLE (wired to global ThemeEngine) */}
              <ThemeToggle compact />

              {/* NOTIFICATIONS BELL */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative w-8.5 h-8.5 rounded-lg border border-white/5 hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all">
                    <Bell className="w-4 h-4" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-slate-900 border border-white/10 text-slate-200">
                  <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-slate-500 flex justify-between items-center">
                    <span>Notifications</span>
                    <button
                      onClick={() => setUnreadNotifications(0)}
                      className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Clear all
                    </button>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  {unreadNotifications > 0 ? (
                    <div className="py-1">
                      <DropdownMenuItem className="text-xs focus:bg-white/5 py-2 flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200 block">Agent connection successful</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Support Bot is live</span>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500">All caught up!</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6 bg-white/10" />

              {/* PROFILE DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-0.5 rounded-full border border-white/10 hover:border-white/20 transition-all">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs select-none">
                      {user?.username?.charAt(0).toUpperCase() || "O"}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-slate-900 border border-white/10 text-slate-200">
                  <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-slate-500">
                    Developer Portal
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="text-xs focus:bg-white/5 cursor-pointer flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>My Credentials</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs focus:bg-white/5 cursor-pointer flex items-center gap-2 text-rose-400 focus:text-rose-300">
                    <LogOut className="w-4 h-4" />
                    <span>Logout Session</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* ─── BODY PAGE VIEW ─── */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* DYNAMIC BREADCRUMBS */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" className="text-xs font-semibold text-slate-500">
                    SaaS Portal
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-bold text-slate-300">
                    {activeItem.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* View Render Area */}
            <div className="animate-[fadeIn_0.2s_ease-out]">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
