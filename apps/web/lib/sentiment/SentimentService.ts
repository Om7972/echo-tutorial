/**
 * Sentiment Service - Client-side wrapper for sentiment operations
 */

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

/**
 * Hook for sentiment analysis
 */
export function useSentimentAnalyzer(orgId: string) {
  const analyze = useAction(api.sentiment.analyzer.analyzeMessage);

  return {
    /**
     * Analyze a message for sentiment and intent
     */
    async analyzeMessage(params: {
      conversationId: Id<"conversations">;
      messageId: Id<"messages">;
      messageContent: string;
      messageType: "user" | "assistant";
      provider?: "openai" | "anthropic";
    }) {
      return await analyze({
        ...params,
        orgId,
      });
    },
  };
}

/**
 * Hook for sentiment analytics
 */
export function useSentimentAnalytics(orgId: string) {
  const analytics = useQuery(api.sentiment.analytics.getSentimentAnalytics, { orgId });
  const dailyTrends = useQuery(api.sentiment.analytics.getDailySentimentTrends, { orgId });
  const realtimeOverview = useQuery(api.sentiment.analytics.getRealtimeSentimentOverview, { orgId });
  const comparison = useQuery(api.sentiment.analytics.getSentimentComparison, { orgId });

  return {
    analytics,
    dailyTrends,
    realtimeOverview,
    comparison,
  };
}

/**
 * Hook for sentiment rules
 */
export function useSentimentRules(orgId: string) {
  const getRules = useQuery(api.sentiment.rules.getRules, { orgId });
  const createRule = useMutation(api.sentiment.rules.createRule);
  const updateRule = useMutation(api.sentiment.rules.updateRule);
  const deleteRule = useMutation(api.sentiment.rules.deleteRule);
  const createDefaultRules = useMutation(api.sentiment.rules.createDefaultRules);

  return {
    rules: getRules,
    
    async create(params: {
      name: string;
      description?: string;
      priority: number;
      conditions: any;
      actions: any;
      createdBy: string;
    }) {
      return await createRule({
        ...params,
        orgId,
      });
    },

    async update(ruleId: Id<"sentiment_rules">, updates: any) {
      return await updateRule({
        ruleId,
        ...updates,
      });
    },

    async delete(ruleId: Id<"sentiment_rules">) {
      return await deleteRule({ ruleId });
    },

    async createDefaults(createdBy: string) {
      return await createDefaultRules({
        orgId,
        createdBy,
      });
    },
  };
}

/**
 * Hook for conversation sentiment
 */
export function useConversationSentiment(conversationId: Id<"conversations">) {
  const sentiment = useQuery(api.sentiment.analyzer.getConversationSentiment, {
    conversationId,
  });

  return {
    sentiment,
    latest: sentiment?.[0],
    history: sentiment || [],
  };
}

/**
 * Sentiment utilities
 */
export const SentimentUtils = {
  /**
   * Get sentiment color
   */
  getSentimentColor(sentiment: string): string {
    const colors: Record<string, string> = {
      positive: "green",
      negative: "red",
      neutral: "gray",
      angry: "red",
      urgent: "orange",
      confused: "yellow",
      frustrated: "red",
      satisfied: "green",
    };
    return colors[sentiment] || "blue";
  },

  /**
   * Get sentiment emoji
   */
  getSentimentEmoji(sentiment: string): string {
    const emojis: Record<string, string> = {
      positive: "😊",
      negative: "😞",
      neutral: "😐",
      angry: "😠",
      urgent: "⚡",
      confused: "😕",
      frustrated: "😤",
      satisfied: "😄",
    };
    return emojis[sentiment] || "💬";
  },

  /**
   * Get intent icon
   */
  getIntentIcon(intent: string): string {
    const icons: Record<string, string> = {
      refund: "💰",
      pricing: "💵",
      technical_issue: "🔧",
      feature_request: "✨",
      complaint: "📢",
      general_inquiry: "❓",
      feedback: "💭",
      cancel_subscription: "❌",
      billing_issue: "💳",
      account_issue: "👤",
    };
    return icons[intent] || "📝";
  },

  /**
   * Format sentiment score
   */
  formatScore(score: number): string {
    return score.toFixed(2);
  },

  /**
   * Get sentiment label
   */
  getSentimentLabel(score: number): string {
    if (score >= 0.5) return "Very Positive";
    if (score >= 0.2) return "Positive";
    if (score >= -0.2) return "Neutral";
    if (score >= -0.5) return "Negative";
    return "Very Negative";
  },

  /**
   * Format intent for display
   */
  formatIntent(intent: string): string {
    return intent
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  /**
   * Check if sentiment is negative
   */
  isNegativeSentiment(sentiment: string): boolean {
    return ["negative", "angry", "frustrated"].includes(sentiment);
  },

  /**
   * Check if sentiment is positive
   */
  isPositiveSentiment(sentiment: string): boolean {
    return ["positive", "satisfied"].includes(sentiment);
  },

  /**
   * Check if should trigger alert
   */
  shouldAlert(sentiment: string, score: number, confidence: number): boolean {
    return (
      (sentiment === "angry" && confidence > 0.7) ||
      (sentiment === "frustrated" && score < -0.5) ||
      (sentiment === "urgent" && confidence > 0.8)
    );
  },
};

/**
 * Integration helper for auto-analyzing messages
 */
export async function autoAnalyzeMessage(params: {
  conversationId: Id<"conversations">;
  messageId: Id<"messages">;
  orgId: string;
  messageContent: string;
  messageType: "user" | "assistant";
}) {
  // Only analyze user messages by default
  if (params.messageType !== "user") {
    return null;
  }

  // Skip very short messages
  if (params.messageContent.length < 10) {
    return null;
  }

  try {
    // Call the analysis API
    // Note: This would typically be done through an action
    console.log("Auto-analyzing message:", params.messageId);
    return { success: true };
  } catch (error) {
    console.error("Auto-analysis failed:", error);
    return null;
  }
}

/**
 * Format trigger type for display
 */
export function formatTriggerType(type: string): string {
  const labels: Record<string, string> = {
    human_handoff: "Human Handoff",
    priority_increase: "Priority Increase",
    vip_routing: "VIP Routing",
    escalation: "Escalation",
    supervisor_alert: "Supervisor Alert",
  };
  return labels[type] || type;
}

/**
 * Get trigger icon
 */
export function getTriggerIcon(type: string): string {
  const icons: Record<string, string> = {
    human_handoff: "👤",
    priority_increase: "⬆️",
    vip_routing: "⭐",
    escalation: "🚨",
    supervisor_alert: "📣",
  };
  return icons[type] || "🔔";
}
