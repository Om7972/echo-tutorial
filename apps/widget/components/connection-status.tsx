// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {/* STATE: OFFLINE */}
      {!isOnline && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="bg-amber-500 text-white px-3 py-1 flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-wider uppercase shrink-0"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Offline - Reconnecting...</span>
        </motion.div>
      )}

      {/* STATE: BACK ONLINE */}
      {showBackOnline && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="bg-emerald-500 text-white px-3 py-1 flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-wider uppercase shrink-0"
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Connection Restored!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
