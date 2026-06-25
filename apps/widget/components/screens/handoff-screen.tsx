// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Mail, FileText, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface HandoffScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
}

export function HandoffScreen({ currentTheme }: HandoffScreenProps) {
  const { pop } = useWidgetRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"form" | "submitting" | "success">("form");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
    }, 1800);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
        <button
          onClick={pop}
          disabled={status === "submitting"}
          title="Go back"
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-20"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Human Handoff
        </h3>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {/* STATE: FORM */}
          {status === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Connect with a representative
                </h3>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Provide your email details and query to connect to the next available agent queue.
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="handoff-email" className="text-[9px] uppercase font-bold tracking-wider text-slate-455 dark:text-slate-500">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    id="handoff-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-350 dark:focus:border-slate-750"
                  />
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label htmlFor="handoff-message" className="text-[9px] uppercase font-bold tracking-wider text-slate-455 dark:text-slate-500">
                  Describe your problem
                </label>
                <div className="relative flex">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="handoff-message"
                    required
                    rows={4}
                    placeholder="Enter details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-350 dark:focus:border-slate-750 resize-none"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-transform active:scale-98 shadow-md cursor-pointer ${currentTheme.primary}`}
              >
                <Send className="w-3.5 h-3.5" /> Submit Handoff Ticket
              </button>
            </motion.form>
          )}

          {/* STATE: SUBMITTING */}
          {status === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 flex flex-col items-center justify-center text-center space-y-4"
            >
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Filing request...</h4>
                <p className="text-[9px] text-slate-450 mt-1">Routing to the active service queue</p>
              </div>
            </motion.div>
          )}

          {/* STATE: SUCCESS */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Ticket Queued Successfully</h4>
                <p className="text-[9px] text-slate-400 max-w-[200px] leading-relaxed mt-1">
                  You are positioned **#2** in the queue. Average wait time is estimated at **2 minutes**.
                </p>
              </div>
              <button
                onClick={() => setStatus("form")}
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold transition-all text-[10px] cursor-pointer"
              >
                Back to form
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
