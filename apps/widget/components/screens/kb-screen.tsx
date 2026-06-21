"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, BookOpen, ExternalLink, ChevronRight, X } from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface KbScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
}

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    id: "vapi",
    title: "How to Integrate Vapi Voice",
    category: "AI & Voice",
    content: "To integrate Vapi, first retrieve your Public Key from the Vapi dashboard. Initialize the useVapi hook inside your React tree, handle mic requests dynamically, and display the audio levels with our custom CSS canvas visualizer.",
  },
  {
    id: "keys",
    title: "Where to Find API Keys",
    category: "Integration",
    content: "Keys for Convex, Vapi, and Clerk auth are in your Project Settings. Make sure to define CONVEX_DEPLOYMENT, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, and VAPI_PUBLIC_KEY inside your .env.local configuration file.",
  },
  {
    id: "theme",
    title: "Palette Theme Configurations",
    category: "Customization",
    content: "Echo supports Emerald, Violet, Blue, and Rose palettes. You can trigger customization panels or set URL brand triggers (e.g. ?color=rose) to match your custom product palette style instantly.",
  },
  {
    id: "errors",
    title: "Sentry Production Monitoring",
    category: "Security",
    content: "We use Sentry for full client/server monitoring. API errors, dashboard render errors, and edge routes are configured to log telemetry and context like organization ID and conversation session keys.",
  },
];

export function KbScreen({ currentTheme }: KbScreenProps) {
  const { pop } = useWidgetRouter();
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = ARTICLES.filter((art) =>
    art.title.toLowerCase().includes(search.toLowerCase()) ||
    art.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
        <button
          onClick={pop}
          title="Go back"
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Knowledge Base
        </h3>
      </div>

      {/* Search Input bar */}
      <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 flex items-center gap-2 shrink-0">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Search help articles"
          className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Articles list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((art, i) => (
            <motion.button
              key={art.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedArticle(art)}
              className="w-full p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
            >
              <div className="min-w-0 pr-3">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  {art.category}
                </span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                  {art.title}
                </h4>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            </motion.button>
          ))
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            No articles found matching search criteria.
          </div>
        )}
      </div>

      {/* Article Detail Overlay / Drawer */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-0 bg-white dark:bg-slate-950 z-20 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {selectedArticle.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                title="Close article"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {selectedArticle.category}
              </span>
              <h2 className="text-sm font-black tracking-tight text-slate-800 dark:text-white leading-relaxed">
                {selectedArticle.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-350 leading-6">
                {selectedArticle.content}
              </p>
            </div>

            {/* Bottom Actions footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/20 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Was this article helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-white transition-all cursor-pointer ${currentTheme.primary}`}
                >
                  Yes, thanks!
                </button>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold transition-all cursor-pointer"
                >
                  No
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
