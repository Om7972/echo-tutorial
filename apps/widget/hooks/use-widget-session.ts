"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

// ─── Cookie Helpers ──────────────────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()!.split(";").shift() || "");
  }
  return null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
}

// ─── ID Generators ────────────────────────────────────────────────────────────
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

export function useWidgetSession(orgId: string) {
  const [visitorId, setVisitorId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Mutations
  const syncSession = useMutation(api.widget.getOrCreateSession);
  const sendNewMessage = useMutation(api.widget.addMessage);
  const changeTypingStatus = useMutation(api.widget.updateTypingStatus);

  // Queries
  const activeSessionDetails = useQuery(
    api.widget.getSession,
    sessionId ? { sessionId } : "skip"
  );
  
  const liveMessages = useQuery(
    api.widget.getMessages,
    sessionId ? { sessionId } : "skip"
  );

  // Initialize and load session from cookies / localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Resolve Visitor ID
    let currentVisitorId = getCookie("echo_visitor_id") || localStorage.getItem("echo_visitor_id");
    if (!currentVisitorId) {
      currentVisitorId = generateId("vis");
      setCookie("echo_visitor_id", currentVisitorId);
      localStorage.setItem("echo_visitor_id", currentVisitorId);
    }
    setVisitorId(currentVisitorId);

    // 2. Resolve Session ID
    let currentSessionId = getCookie("echo_session_id") || localStorage.getItem("echo_session_id");
    if (!currentSessionId) {
      currentSessionId = generateId("sess");
      setCookie("echo_session_id", currentSessionId);
      localStorage.setItem("echo_session_id", currentSessionId);
    }
    setSessionId(currentSessionId);
    setIsHydrated(true);
  }, []);

  // Sync session details with database on mount/load
  useEffect(() => {
    if (!isHydrated || !visitorId || !sessionId) return;

    const browserInfo = {
      userAgent: window.navigator.userAgent,
      language: window.navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    // Call mutation to initialize/register session
    syncSession({
      sessionId,
      visitorId,
      orgId,
      browserInfo,
    }).then((res) => {
      // If the database expired the inactive session, save the new one!
      if (res.expired && res.session) {
        const newSessId = res.session.sessionId;
        setSessionId(newSessId);
        setCookie("echo_session_id", newSessId);
        localStorage.setItem("echo_session_id", newSessId);
      }
    });
  }, [isHydrated, visitorId, sessionId, orgId, syncSession]);

  // Send Message Wrapper
  const sendMessage = useCallback(
    async (text: string, sender: "user" | "assistant" = "user") => {
      if (!sessionId) return;

      const time = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send message to database
      await sendNewMessage({
        sessionId,
        sender,
        text,
        time,
      });
    },
    [sessionId, sendNewMessage]
  );

  // Set Typing Status Wrapper
  const setTypingStatus = useCallback(
    async (status: "idle" | "typing") => {
      if (!sessionId) return;
      await changeTypingStatus({
        sessionId,
        typingStatus: status,
      });
    },
    [sessionId, changeTypingStatus]
  );

  return {
    visitorId,
    sessionId,
    isHydrated,
    messages: liveMessages || [],
    sessionDetails: activeSessionDetails,
    sendMessage,
    setTypingStatus,
  };
}
