// @ts-nocheck
"use client";

import { motion } from "framer-motion";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}>
      {/* Shimmer Shading Layer */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </div>
  );
}

export function HomeScreenSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-40 h-5" />
        <Skeleton className="w-full h-3" />
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-full h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-2 max-w-[80%] ${i % 2 === 0 ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
          <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
          <Skeleton className={`h-12 rounded-2xl rounded-tl-none ${i % 2 === 0 ? "w-44" : "w-64"}`} />
        </div>
      ))}
    </div>
  );
}
