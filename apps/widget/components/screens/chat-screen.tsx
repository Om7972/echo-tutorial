"use client";

import { useRef, useEffect } from "react";
import { ArrowLeft, Bot, Send } from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface ChatScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
  messages: any[];
  sendMessage: (text: string, sender?: "user" | "assistant") => Promise<void>;
  isAgentTyping: boolean;
  inputText: string;
  handleInputChange: (val: string) => void;
  handleSend: (text: string) => void;
  QUICK_REPLIES: string[];
}

export function ChatScreen({
  currentTheme,
  messages,
  sendMessage,
  isAgentTyping,
  inputText,
  handleInputChange,
  handleSend,
  QUICK_REPLIES,
}: ChatScreenProps) {
  const { pop } = useWidgetRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAgentTyping]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
        <button
          onClick={pop}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
          AI Chat Agent
        </h3>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/40">
        {messages.map((m) => (
          <div
            key={m._id || m.id}
            className={`flex gap-2 text-xs leading-relaxed max-w-[85%] ${
              m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                m.sender === "user"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  : `${currentTheme.primary} text-white`
              }`}
            >
              {m.sender === "user" ? "U" : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`px-3 py-2 rounded-2xl ${
                m.sender === "user"
                  ? "bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tr-none"
                  : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 text-slate-800 dark:text-slate-200 rounded-tl-none"
              }`}
            >
              <p>{m.text}</p>
              <span className="text-[9px] text-slate-400 block text-right mt-1">{m.time}</span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isAgentTyping && (
          <div className="flex gap-2 items-center text-xs text-slate-400 mr-auto max-w-[80%]">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${currentTheme.primary} text-white`}>
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-3 py-2.5 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {messages.length <= 2 && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 flex flex-wrap gap-1.5 shrink-0">
          {QUICK_REPLIES.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all text-left bg-white dark:bg-slate-900 hover:scale-98 cursor-pointer ${currentTheme.text} ${currentTheme.border} ${currentTheme.bgLight}`}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-805 bg-white dark:bg-slate-950 flex gap-2 shrink-0 items-center">
        <input
          type="text"
          placeholder="Ask support..."
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend(inputText);
          }}
          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-700"
        />
        <button
          onClick={() => handleSend(inputText)}
          className={`w-9 h-9 text-white rounded-xl flex items-center justify-center transition-transform active:scale-95 ${currentTheme.primary}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
