"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Code,
  Settings,
  Paintbrush,
  Copy,
  Check,
  RefreshCw,
  Info,
  ExternalLink,
} from "lucide-react";

export default function DemoPage() {
  const [org, setOrg] = useState("Acme Labs");
  const [color, setColor] = useState("blue"); // blue, emerald, violet, rose
  const [theme, setTheme] = useState("dark"); // dark, light
  const [logo, setLogo] = useState("");
  const [copied, setCopied] = useState(false);

  // Trigger reloading of the script widget.js
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Remove existing widget if present
    const existingContainer = document.getElementById("echo-widget-container");
    if (existingContainer) {
      existingContainer.remove();
    }
    // Reset global initialized flag
    // @ts-ignore
    window.__ECHO_WIDGET_INITIALIZED__ = false;

    // Dynamically insert the widget script
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.setAttribute("data-org-id", org);
    script.setAttribute("data-color", color);
    script.setAttribute("data-theme", theme);
    if (logo) {
      script.setAttribute("data-logo", logo);
    }
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      const container = document.getElementById("echo-widget-container");
      if (container) {
        container.remove();
      }
    };
  }, [org, color, theme, logo, key]);

  const embedCode = `<script
  src="${typeof window !== "undefined" ? window.location.origin : "https://widget.echo.com"}/widget.js"
  data-org-id="${org}"
  data-color="${color}"
  data-theme="${theme}"${logo ? `\n  data-logo="${logo}"` : ""}
  async
></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/20 selection:text-blue-200">
      {/* Top Banner decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.08),transparent_50%)] pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
            E
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block">ECHO</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Support Widget Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            API Reference <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Side: Config Panel */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Widget Sandbox <Sparkles className="w-6 h-6 text-blue-500" />
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure, brand, preview, and extract copy-paste scripts for your custom-colored embeddable chat widgets.
            </p>
          </div>

          {/* Configurations Block */}
          <div className="p-5 border border-slate-900 rounded-2xl bg-slate-900/40 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">Live Customizer</h3>
              </div>
              <button
                onClick={() => setKey((prev) => prev + 1)}
                title="Reload Widget Script"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Org Name */}
              <div className="space-y-1.5">
                <label htmlFor="org" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Organization Name</label>
                <input
                  id="org"
                  type="text"
                  placeholder="Organization Name"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="w-full pl-3.5 pr-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <label htmlFor="logo" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Logo Image URL (Optional)</label>
                <input
                  id="logo"
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full pl-3.5 pr-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Color Swatches */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Accent Brand Color</label>
                <div className="flex items-center gap-3 py-1">
                  {[
                    { id: "blue", hex: "#2563eb", name: "Blue" },
                    { id: "emerald", hex: "#059669", name: "Emerald" },
                    { id: "violet", hex: "#7c3aed", name: "Violet" },
                    { id: "rose", hex: "#e11d48", name: "Rose" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.id)}
                      className={`group relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                        color === c.id ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {color === c.id && (
                        <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark/Light Toggles */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Widget Color Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme("dark")}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      theme === "dark"
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Dark Theme
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      theme === "light"
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Light Theme
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 border border-blue-500/10 rounded-2xl bg-blue-500/5 flex gap-3 text-xs text-blue-400 leading-relaxed">
            <Info className="w-5 h-5 shrink-0" />
            <p>
              The support widget is fully responsive and supports a minimized pill interface as well as expanded screens. See it live at the bottom right corner of this page!
            </p>
          </div>
        </section>

        {/* Right Side: Code Copier */}
        <section className="lg:col-span-7 space-y-6">
          <div className="p-5 border border-slate-900 rounded-2xl bg-slate-900/20 backdrop-blur-sm h-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">Embed Integration Script</h3>
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 overflow-x-auto text-[11px] font-mono text-emerald-400 leading-5">
                  {embedCode}
                </pre>
              </div>
            </div>

            {/* Quick Walkthrough / Spec list */}
            <div className="border-t border-slate-900 pt-6 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-white">🗂 Script Size</h4>
                <p className="text-[11px] text-slate-400">Only 1.4KB. Zero overhead on primary page load speed.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">⚙ sandboxed Iframe</h4>
                <p className="text-[11px] text-slate-400">Prevents global DOM style leakage and script collision.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">📱 Fully Responsive</h4>
                <p className="text-[11px] text-slate-400">Dynamic full-screen mode toggles for mobile viewport sizes.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">⚡ Auto Persistence</h4>
                <p className="text-[11px] text-slate-400">Maintains conversation logs and user state sessions.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-6 text-center text-xs text-slate-600 bg-slate-950/40 relative z-10">
        © 2026 Echo Inc. All rights reserved.
      </footer>
    </div>
  );
}
