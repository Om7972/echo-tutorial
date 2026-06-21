"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, PhoneOff, MicOff, Volume2, ShieldAlert } from "lucide-react";
import { useWidgetRouter } from "../../hooks/use-widget-router";

interface VoiceScreenProps {
  currentTheme: { primary: string; text: string; bgLight: string; border: string; glow: string };
}

export function VoiceScreen({ currentTheme }: VoiceScreenProps) {
  const { pop } = useWidgetRouter();
  const [callState, setCallState] = useState<"idle" | "connecting" | "active" | "ended">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  // Timer for active call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "active") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = () => {
    setCallState("connecting");
    setTimeout(() => {
      setCallState("active");
    }, 1500);
  };

  const handleEndCall = () => {
    setCallState("ended");
    setTimeout(() => {
      setCallState("idle");
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100 relative">
      {/* Absolute Header */}
      <div className="p-4 flex items-center gap-3 shrink-0 z-10 relative">
        <button
          onClick={pop}
          disabled={callState === "active" || callState === "connecting"}
          title="Go back"
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-20"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Voice Portal
        </span>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          {/* STATE: IDLE */}
          {callState === "idle" && (
            <motion.div
              key="idle"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="space-y-6 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Mic className="w-9 h-9 text-slate-300" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Direct Voice Support</h3>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-1.5 leading-relaxed">
                  Start an inbound voice conversation with our AI agent to talk and resolve requests instantly.
                </p>
              </div>
              <button
                onClick={handleStartCall}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-transform active:scale-95 shadow-md cursor-pointer ${currentTheme.primary}`}
              >
                Connect Voice Agent
              </button>
            </motion.div>
          )}

          {/* STATE: CONNECTING */}
          {callState === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center relative">
                <span className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping" />
                <Volume2 className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white animate-pulse">Establishing Tunnel...</h3>
                <p className="text-[10px] text-slate-500 mt-1">Connecting pre-warmed audio channels</p>
              </div>
            </motion.div>
          )}

          {/* STATE: ACTIVE */}
          {callState === "active" && (
            <motion.div
              key="active"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="space-y-8 flex flex-col items-center w-full"
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Call
                </span>
                <span className="text-xl font-black font-mono text-white mt-1.5">
                  {formatDuration(duration)}
                </span>
              </div>

              {/* Waveform Visualization Bars */}
              <div className="flex items-center justify-center gap-1 h-14 w-full px-8">
                {[4, 8, 3, 7, 9, 5, 2, 6, 8, 4, 7, 3, 5, 9, 6].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isMuted ? 4 : [h * 4, (12 - h) * 4, h * 4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                    className={`w-1 rounded-full ${isMuted ? "bg-slate-700" : "bg-blue-500"}`}
                  />
                ))}
              </div>

              {/* In-Call Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                    isMuted
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <MicOff className="w-4 h-4" />
                </button>
                <button
                  onClick={handleEndCall}
                  title="End Call"
                  className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 transition-transform active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE: ENDED */}
          {callState === "ended" && (
            <motion.div
              key="ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                <PhoneOff className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-xs font-bold text-slate-400">Call Terminated</h3>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
