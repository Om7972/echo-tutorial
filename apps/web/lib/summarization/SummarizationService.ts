/**
 * Summarization Service
 * React hooks and utilities for conversation summarization
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

/**
 * Summarization Hooks
 */

export function useSummary(conversationId: Id<"unified_conversations">) {
  return useQuery(api.summarization.generator.getSummary, {
    conversationId,
  });
}

export function useSummaries(params: {
  orgId: string;
  status?: string[];
  limit?: number;
}) {
  return useQuery(api.summarization.generator.getSummaries, params);
}

export function useGenerateSummary() {
  return useAction(api.summarization.generator.generateSummary);
}

export function useUpdateSummary() {
  return useMutation(api.summarization.generator.updateSummary);
}

export function useCompleteActionItem() {
  return useMutation(api.summarization.generator.completeActionItem);
}

/**
 * Utility Functions
 */

export const SummarizationUtils = {
  /**
   * Get sentiment color class
   */
  getSentimentColor(sentiment: string): string {
    const colors: Record<string, string> = {
      positive: "bg-green-100 text-green-800",
      negative: "bg-red-100 text-red-800",
      neutral: "bg-gray-100 text-gray-800",
      mixed: "bg-yellow-100 text-yellow-800",
    };
    return colors[sentiment] || colors.neutral;
  },

  /**
   * Get sentiment emoji
   */
  getSentimentEmoji(sentiment: string): string {
    const emojis: Record<string, string> = {
      positive: "😊",
      negative: "😞",
      neutral: "😐",
      mixed: "😕",
    };
    return emojis[sentiment] || "😐";
  },

  /**
   * Get priority color class
   */
  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-gray-100 text-gray-800",
    };
    return colors[priority] || colors.medium;
  },

  /**
   * Format sentiment score
   */
  formatSentimentScore(score: number): string {
    if (score > 0.5) return "Very Positive";
    if (score > 0.1) return "Positive";
    if (score > -0.1) return "Neutral";
    if (score > -0.5) return "Negative";
    return "Very Negative";
  },

  /**
   * Calculate summary quality score (0-100)
   */
  calculateQualityScore(summary: any): number {
    let score = 0;

    // Has short summary
    if (summary.shortSummary && summary.shortSummary.length > 10) {
      score += 20;
    }

    // Has detailed summary
    if (summary.detailedSummary && summary.detailedSummary.length > 50) {
      score += 20;
    }

    // Has root cause
    if (summary.rootCause) {
      score += 15;
    }

    // Has resolution steps
    if (summary.resolutionSteps && summary.resolutionSteps.length > 0) {
      score += 15;
    }

    // Has action items
    if (summary.actionItems && summary.actionItems.length > 0) {
      score += 15;
    }

    // Has tags
    if (summary.tags && summary.tags.length > 0) {
      score += 15;
    }

    return score;
  },

  /**
   * Export summary to markdown
   */
  exportToMarkdown(summary: any): string {
    let markdown = `# Conversation Summary\n\n`;

    if (summary.shortSummary) {
      markdown += `## Quick Summary\n\n${summary.shortSummary}\n\n`;
    }

    if (summary.sentiment) {
      markdown += `## Sentiment\n\n**${summary.sentiment}** (Score: ${summary.sentimentScore?.toFixed(2) || "N/A"})\n\n`;
    }

    if (summary.detailedSummary) {
      markdown += `## Detailed Summary\n\n${summary.detailedSummary}\n\n`;
    }

    if (summary.rootCause) {
      markdown += `## Root Cause\n\n${summary.rootCause}\n\n`;
    }

    if (summary.resolutionSteps && summary.resolutionSteps.length > 0) {
      markdown += `## Resolution Steps\n\n`;
      summary.resolutionSteps.forEach((step: string, index: number) => {
        markdown += `${index + 1}. ${step}\n`;
      });
      markdown += `\n`;
    }

    if (summary.actionItems && summary.actionItems.length > 0) {
      markdown += `## Action Items\n\n`;
      summary.actionItems.forEach((item: any) => {
        const status = item.completed ? "[x]" : "[ ]";
        markdown += `- ${status} **${item.priority.toUpperCase()}**: ${item.description}\n`;
      });
      markdown += `\n`;
    }

    if (summary.tags && summary.tags.length > 0) {
      markdown += `## Tags\n\n${summary.tags.map((t: string) => `\`${t}\``).join(", ")}\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `*Generated: ${new Date(summary.createdAt).toLocaleString()}*\n`;
    markdown += `*Messages: ${summary.messageCount} | Cost: $${summary.costUSD.toFixed(4)}*\n`;

    return markdown;
  },

  /**
   * Export summary to JSON
   */
  exportToJSON(summary: any): string {
    return JSON.stringify(summary, null, 2);
  },

  /**
   * Download summary as file
   */
  downloadSummary(summary: any, format: "markdown" | "json" | "txt") {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "markdown") {
      content = this.exportToMarkdown(summary);
      filename = `summary-${summary._id}.md`;
      mimeType = "text/markdown";
    } else if (format === "json") {
      content = this.exportToJSON(summary);
      filename = `summary-${summary._id}.json`;
      mimeType = "application/json";
    } else {
      content = this.exportToMarkdown(summary).replace(/[#*`-]/g, "");
      filename = `summary-${summary._id}.txt`;
      mimeType = "text/plain";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get completion percentage for action items
   */
  getActionItemsProgress(actionItems: any[]): number {
    if (!actionItems || actionItems.length === 0) return 0;
    const completed = actionItems.filter((item) => item.completed).length;
    return Math.round((completed / actionItems.length) * 100);
  },

  /**
   * Get overdue action items
   */
  getOverdueActionItems(actionItems: any[]): any[] {
    if (!actionItems) return [];
    const now = Date.now();
    return actionItems.filter(
      (item) => !item.completed && item.dueDate && item.dueDate < now
    );
  },

  /**
   * Estimate summary generation cost
   */
  estimateCost(messageCount: number, provider: "openai" | "anthropic"): number {
    // Rough estimates based on average message length
    const avgTokensPerMessage = 50;
    const totalInputTokens = messageCount * avgTokensPerMessage;
    const outputTokens = 500; // Average summary length

    if (provider === "openai") {
      return (totalInputTokens * 0.03 + outputTokens * 0.06) / 1000;
    } else {
      return (totalInputTokens * 0.003 + outputTokens * 0.015) / 1000;
    }
  },
};

/**
 * Type Guards
 */

export const SummarizationTypes = {
  isValidProvider(value: string): value is "openai" | "anthropic" {
    return ["openai", "anthropic"].includes(value);
  },

  isValidStatus(value: string): value is "generating" | "completed" | "failed" | "outdated" {
    return ["generating", "completed", "failed", "outdated"].includes(value);
  },

  isValidPriority(value: string): value is "low" | "medium" | "high" {
    return ["low", "medium", "high"].includes(value);
  },
};
