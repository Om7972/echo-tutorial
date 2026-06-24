/**
 * Evaluation Service
 * Helper functions for AI evaluation
 */

import { ConvexClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export class EvaluationService {
  private convex: ConvexClient;

  constructor(convex: ConvexClient) {
    this.convex = convex;
  }

  /**
   * Evaluate an AI response
   */
  async evaluateResponse(params: {
    orgId: string;
    conversationId: Id<"conversations">;
    messageId?: Id<"messages">;
    query: string;
    response: string;
    expectedResponse?: string;
    sourcesUsed?: string[];
    provider?: "openai" | "anthropic";
  }) {
    try {
      const result = await this.convex.action(api.evaluation.evaluator.evaluateResponse, {
        ...params,
        provider: params.provider || "openai",
      });

      return {
        success: true,
        evaluationId: result,
      };
    } catch (error) {
      console.error("Evaluation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get evaluation statistics
   */
  async getStats(orgId: string, days: number = 30) {
    try {
      const stats = await this.convex.query(api.evaluation.evaluator.getEvaluationStats, {
        orgId,
        days,
      });

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Failed to get stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get evaluations that need review
   */
  async getReviewQueue(orgId: string, limit: number = 50) {
    try {
      const evaluations = await this.convex.query(api.evaluation.evaluator.getEvaluations, {
        orgId,
        needsReview: true,
        limit,
      });

      return {
        success: true,
        data: evaluations,
      };
    } catch (error) {
      console.error("Failed to get review queue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate quality report
   */
  async generateReport(params: {
    orgId: string;
    dateFrom: string;
    dateTo: string;
    reportType: "daily" | "weekly" | "monthly" | "custom";
  }) {
    try {
      const reportId = await this.convex.action(api.evaluation.evaluator.generateQualityReport, params);

      return {
        success: true,
        reportId,
      };
    } catch (error) {
      console.error("Failed to generate report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Auto-evaluate message after AI response
   */
  async autoEvaluateMessage(params: {
    orgId: string;
    conversationId: Id<"conversations">;
    messageId: Id<"messages">;
    query: string;
    response: string;
    sourcesUsed?: string[];
  }) {
    // Check if auto-evaluation is enabled
    const autoEvalEnabled = process.env.NEXT_PUBLIC_AUTO_EVALUATE === "true";
    if (!autoEvalEnabled) {
      return { success: false, error: "Auto-evaluation disabled" };
    }

    return this.evaluateResponse(params);
  }

  /**
   * Check if response quality is acceptable
   */
  isQualityAcceptable(evaluation: {
    hallucinationScore: number;
    confidenceScore: number;
    qualityScore: number;
  }): boolean {
    const thresholds = {
      hallucinationMax: parseFloat(process.env.NEXT_PUBLIC_HALLUCINATION_THRESHOLD || "0.3"),
      confidenceMin: parseFloat(process.env.NEXT_PUBLIC_CONFIDENCE_THRESHOLD || "0.7"),
      qualityMin: 0.6,
    };

    return (
      evaluation.hallucinationScore <= thresholds.hallucinationMax &&
      evaluation.confidenceScore >= thresholds.confidenceMin &&
      evaluation.qualityScore >= thresholds.qualityMin
    );
  }

  /**
   * Format evaluation score for display
   */
  formatScore(score: number): string {
    return `${(score * 100).toFixed(1)}%`;
  }

  /**
   * Get score color class
   */
  getScoreColor(score: number): string {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  }

  /**
   * Get quality level
   */
  getQualityLevel(score: number): "excellent" | "good" | "fair" | "poor" {
    if (score >= 0.9) return "excellent";
    if (score >= 0.75) return "good";
    if (score >= 0.6) return "fair";
    return "poor";
  }
}

/**
 * Create evaluation service instance
 */
export function createEvaluationService(convex: ConvexClient): EvaluationService {
  return new EvaluationService(convex);
}

/**
 * Evaluation hooks for React components
 */
export const useEvaluationService = (convex: ConvexClient) => {
  const service = new EvaluationService(convex);

  return {
    evaluateResponse: service.evaluateResponse.bind(service),
    getStats: service.getStats.bind(service),
    getReviewQueue: service.getReviewQueue.bind(service),
    generateReport: service.generateReport.bind(service),
    autoEvaluateMessage: service.autoEvaluateMessage.bind(service),
    isQualityAcceptable: service.isQualityAcceptable.bind(service),
    formatScore: service.formatScore.bind(service),
    getScoreColor: service.getScoreColor.bind(service),
    getQualityLevel: service.getQualityLevel.bind(service),
  };
};
