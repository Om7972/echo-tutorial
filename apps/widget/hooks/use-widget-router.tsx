// @ts-nocheck
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

// Available screens
export type WidgetScreen =
  | "home"
  | "inbox"
  | "chat"
  | "kb"
  | "voice"
  | "handoff"
  | "loading";

interface WidgetRouterContextProps {
  currentScreen: WidgetScreen;
  stack: WidgetScreen[];
  push: (screen: WidgetScreen) => void;
  pop: () => void;
  replace: (screen: WidgetScreen) => void;
  reset: (screen: WidgetScreen) => void;
  canGoBack: boolean;
}

const WidgetRouterContext = createContext<WidgetRouterContextProps | null>(null);

export function useWidgetRouter() {
  const ctx = useContext(WidgetRouterContext);
  if (!ctx) {
    throw new Error("useWidgetRouter must be used within a WidgetRouterProvider");
  }
  return ctx;
}

export function WidgetRouterProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [stack, setStack] = useState<WidgetScreen[]>(["loading"]);

  // Handle deep linking on mount
  useEffect(() => {
    const deepLinkScreen = searchParams.get("screen") as WidgetScreen | null;
    const validScreens: WidgetScreen[] = ["home", "inbox", "chat", "kb", "voice", "handoff"];
    
    if (deepLinkScreen && validScreens.includes(deepLinkScreen)) {
      if (deepLinkScreen === "home") {
        setStack(["home"]);
      } else {
        // Pre-populate stack with home so that back navigation works!
        setStack(["home", deepLinkScreen]);
      }
    } else {
      setStack(["home"]);
    }
  }, [searchParams]);

  // Navigate forward by pushing a new screen
  const push = useCallback((screen: WidgetScreen) => {
    setStack((prev) => {
      // Avoid pushing duplicate screen on top
      if (prev[prev.length - 1] === screen) return prev;
      return [...prev, screen];
    });
  }, []);

  // Navigate backward by popping the top screen
  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  // Replace top screen
  const replace = useCallback((screen: WidgetScreen) => {
    setStack((prev) => {
      const next = [...prev];
      next[next.length - 1] = screen;
      return next;
    });
  }, []);

  // Reset to single screen
  const reset = useCallback((screen: WidgetScreen) => {
    setStack([screen]);
  }, []);

  const currentScreen = stack[stack.length - 1] || "home";
  const canGoBack = stack.length > 1;

  const value: WidgetRouterContextProps = {
    currentScreen,
    stack,
    push,
    pop,
    replace,
    reset,
    canGoBack,
  };

  return (
    <WidgetRouterContext.Provider value={value}>
      {children}
    </WidgetRouterContext.Provider>
  );
}
