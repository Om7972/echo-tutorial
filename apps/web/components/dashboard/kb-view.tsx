"use client"

import { useState } from "react"
import { BookOpen, Search, Plus, ExternalLink, HelpCircle } from "lucide-react"

interface Article {
  id: string
  title: string
  category: string
  views: number
  lastUpdated: string
}

const mockArticles: Article[] = [
  { id: "1", title: "Configuring Vapi Webhook Callbacks", category: "Integration", views: 1240, lastUpdated: "2 hours ago" },
  { id: "2", title: "Setting up OpenAI vs Anthropic Models", category: "Models", views: 890, lastUpdated: "1 day ago" },
  { id: "3", title: "Handling User Voice Interruptions", category: "Orchestration", views: 2450, lastUpdated: "3 days ago" },
  { id: "4", title: "Securing JWT Auth Tokens in Convex", category: "Security", views: 670, lastUpdated: "1 week ago" },
]

export function KBView() {
  const [articles, setArticles] = useState<Article[]>(mockArticles)
  const [search, setSearch] = useState("")

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddArticle = () => {
    const newArt: Article = {
      id: String(articles.length + 1),
      title: "Custom Agent Voice Customization Guide",
      category: "Guides",
      views: 0,
      lastUpdated: "Just now",
    }
    setArticles([newArt, ...articles])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-xs text-slate-400">Manage support docs, system guidelines, and FAQs for your agents</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Button */}
          <button
            onClick={handleAddArticle}
            className="flex items-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search & Categories */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search guides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/40 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="p-4 border border-white/5 rounded-2xl bg-slate-950/20 space-y-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categories</h4>
            <div className="flex flex-col gap-1">
              {["All Resources", "Integration", "Models", "Orchestration", "Security"].map((c) => (
                <button
                  key={c}
                  className="w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Article Table */}
        <div className="lg:col-span-3 border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-white/5">
          <div className="p-4 bg-slate-950/40 grid grid-cols-5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="col-span-3">Article Title</div>
            <div className="text-center">Views</div>
            <div className="text-right">Updated</div>
          </div>

          {filtered.map((art) => (
            <div
              key={art.id}
              className="p-4 grid grid-cols-5 items-center text-xs hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-slate-200 block truncate">{art.title}</span>
                  <span className="text-[9px] text-slate-500 font-medium uppercase mt-0.5 inline-block">
                    {art.category}
                  </span>
                </div>
              </div>
              <div className="text-center text-slate-400 font-semibold">{art.views}</div>
              <div className="text-right text-slate-500">{art.lastUpdated}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
