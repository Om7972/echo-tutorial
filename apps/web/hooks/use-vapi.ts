// @ts-nocheck
"use client";

/**
 * useVapi Hook
 *
 * Custom hook to orchestrate the Vapi AI Voice Assistant client-side lifecycle.
 *
 * Features:
 * - Syncs call state with Convex database (voice_sessions, voice_messages).
 * - Exposes states: idle, connecting, listening, speaking, processing.
 * - Captures volume levels for waveform visualization.
 * - Handles mute, hangup, error states, and interruption tracking.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { logger } from "@/lib/logger";

export type AssistantProvider = "openai" | "anthropic" | "grok";
export type VoiceAssistantStatus = "idle" | "connecting" | "listening" | "speaking" | "processing";

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function useVapi(userId: string | undefined) {
  // --- Convex Mutations ---
  const createSession = useMutation(api.voice_sessions.createSession);
  const startSession = useMutation(api.voice_sessions.startSession);
  const endSession = useMutation(api.voice_sessions.endSession);
  const failSession = useMutation(api.voice_sessions.failSession);
  const addMessage = useMutation(api.voice_messages.addMessage);
  const incrementReconnect = useMutation(api.voice_sessions.incrementReconnect);

  // --- SDK Ref ---
  const vapiRef = useRef<any>(null);

  // --- Local State ---
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [activeSessionId, setActiveSessionId] = useState<Id<"voice_sessions"> | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AssistantProvider>("openai");

  // Keep a ref of the active session ID to access inside event callbacks
  const activeSessionIdRef = useRef<Id<"voice_sessions"> | null>(null);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Keep a ref of the userId to access inside callbacks safely
  const userIdRef = useRef<string | undefined>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // --- Lazy Vapi Instantiation ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initVapi = async () => {
      try {
        const VapiModule = await import("@vapi-ai/web");
        const VapiClass = VapiModule.default;
        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
        
        if (!publicKey) {
          logger.warn("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not defined in environment variables.");
        }

        const vapiInstance = new VapiClass(publicKey);
        vapiRef.current = vapiInstance;

        // --- Register event listeners ---
        vapiInstance.on("call-start-progress", () => {
          setStatus("connecting");
          logger.info("Vapi call connection starting...");
        });

        vapiInstance.on("call-start", (callDetails?: any) => {
          setStatus("listening");
          setIsMuted(vapiInstance.isMuted());
          const currentSessionId = activeSessionIdRef.current;
          
          if (currentSessionId) {
            const callId = callDetails?.id ?? "vapi_call_active";
            startSession({ sessionId: currentSessionId, vapiCallId: callId })
              .catch((err) => logger.error("Failed to start session in Convex", err));
          }
          logger.info("Vapi call started successfully");
        });

        vapiInstance.on("speech-start", () => {
          setStatus("speaking");
        });

        vapiInstance.on("speech-end", () => {
          setStatus("listening");
        });

        vapiInstance.on("volume-level", (level: number) => {
          setVolume(level);
        });

        vapiInstance.on("message", (msg: any) => {
          if (!msg) return;

          // Transcript handling
          if (msg.type === "transcript") {
            const role = msg.role;
            const text = msg.transcript;
            const isFinal = msg.transcriptType === "final";

            if (role === "user" || role === "assistant") {
              // Update local state transcript trail
              if (isFinal) {
                setTranscript((prev) => [...prev, { role, content: text, timestamp: Date.now() }]);

                // If user finished speaking, indicate processing
                if (role === "user") {
                  setStatus("processing");
                }

                // Persist final transcript utterance to Convex
                const currentSessionId = activeSessionIdRef.current;
                const currentUserId = userIdRef.current;
                if (currentSessionId && currentUserId) {
                  addMessage({
                    sessionId: currentSessionId,
                    userId: currentUserId,
                    role,
                    content: text,
                  }).catch((err) => logger.error("Failed to save transcript message to Convex", err));
                }
              }
            }
          }
        });

        vapiInstance.on("call-end", () => {
          setStatus("idle");
          setVolume(0);
          const currentSessionId = activeSessionIdRef.current;
          if (currentSessionId) {
            endSession({ sessionId: currentSessionId, endReason: "hangup" })
              .catch((err) => logger.error("Failed to end session in Convex", err));
          }
          setActiveSessionId(null);
          logger.info("Vapi call ended");
        });

        vapiInstance.on("error", (err: any) => {
          logger.error("Vapi call error", err);
          setError(err?.message ?? String(err));
          setStatus("idle");
          setVolume(0);
          
          const currentSessionId = activeSessionIdRef.current;
          if (currentSessionId) {
            failSession({
              sessionId: currentSessionId,
              errorMessage: err?.message ?? String(err),
              endReason: "error",
            }).catch((cErr) => logger.error("Failed to fail session in Convex", cErr));
          }
          setActiveSessionId(null);
        });
      } catch (err) {
        logger.error("Failed to load Vapi Web SDK module", err);
      }
    };

    initVapi();

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  // --- Actions ---

  /**
   * Starts an inbound conversation call with the Vapi assistant
   */
  const startCall = useCallback(async (selectedProvider: AssistantProvider) => {
    if (!userId) {
      setError("User must be authenticated to start a voice session.");
      return;
    }

    if (!vapiRef.current) {
      setError("Voice Assistant SDK is not initialized yet.");
      return;
    }

    try {
      setError(null);
      setTranscript([]);
      setProvider(selectedProvider);
      setStatus("connecting");

      // 1. Create session in Convex
      const sessionId = await createSession({
        userId,
        provider: selectedProvider,
      });
      setActiveSessionId(sessionId);

      // 2. Map select provider to VAPI dynamic model config
      let assistantConfig: any = {
        name: "Voice Assistant",
        firstMessage: "Hello! I am your AI Voice Assistant. How can I help you today?",
        voice: {
          provider: "playht",
          voiceId: "susan", // Standard high-quality voice
        },
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
      };

      if (selectedProvider === "openai") {
        assistantConfig.model = {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional, friendly voice assistant. Answer concisely and conversationally since the user is listening to speech.",
            },
          ],
        };
      } else if (selectedProvider === "anthropic") {
        assistantConfig.model = {
          provider: "anthropic",
          model: "claude-3-5-sonnet-20240620",
          messages: [
            {
              role: "system",
              content: "You are a professional, helpful voice assistant. Keep answers brief and conversational.",
            },
          ],
        };
      } else if (selectedProvider === "grok") {
        assistantConfig.model = {
          provider: "xai",
          model: "grok-beta",
          messages: [
            {
              role: "system",
              content: "You are Grok, an AI voice assistant. Answer questions concisely, with a light sense of humor, and be very conversational.",
            },
          ],
        };
      }

      // 3. Start Vapi session
      vapiRef.current.start(assistantConfig);
    } catch (err: any) {
      logger.error("Failed to start voice call", err);
      setError(err?.message ?? "An unexpected error occurred starting the voice call.");
      setStatus("idle");
      setActiveSessionId(null);
    }
  }, [userId, createSession]);

  /**
   * Stops/Hangs up the current active call
   */
  const endCall = useCallback(async () => {
    if (!vapiRef.current) return;
    try {
      vapiRef.current.stop();
    } catch (err) {
      logger.error("Error stopping Vapi call", err);
    }
  }, []);

  /**
   * Toggles microphone mute state
   */
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    try {
      const nextMuteState = !isMuted;
      vapiRef.current.setMuted(nextMuteState);
      setIsMuted(nextMuteState);
      logger.info(`Microphone ${nextMuteState ? "muted" : "unmuted"}`);
    } catch (err) {
      logger.error("Error toggling mute state", err);
    }
  }, [isMuted]);

  /**
   * Attempts to reconnect to the current session on connection failure
   */
  const reconnectCall = useCallback(async () => {
    const currentSessionId = activeSessionId;
    if (!currentSessionId || !vapiRef.current) return;

    try {
      setStatus("connecting");
      logger.info("Attempting voice session reconnection...");
      
      // Increment reconnect count in Convex
      await incrementReconnect({ sessionId: currentSessionId });

      // Stop any existing connection and re-trigger start
      vapiRef.current.stop();
      startCall(provider);
    } catch (err) {
      logger.error("Error during reconnection attempt", err);
    }
  }, [activeSessionId, provider, startCall, incrementReconnect]);

  return {
    status,
    activeSessionId,
    volume,
    isMuted,
    transcript,
    error,
    provider,
    startCall,
    endCall,
    toggleMute,
    reconnectCall,
  };
}
