/**
 * AI Evaluation System
 * Measure AI response quality and accuracy
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getEvaluations = query({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    needsReview: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("ai_evaluations")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));

    if (args.conversationId) {
      q = ctx.db
        .query("ai_evaluations")
        .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId!));
    }

    if (args.needsReview !== undefined) {
      q = ctx.db
        .query("ai_evaluations")
        .withIndex("by_needs_review", (q) => q.eq("needsReview", args.needsReview));
    }

    return await q.order("desc").take(args.limit || 50);
  },
});

export const getEvaluationStats = query({
  args: {
    orgId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.days || 30) * 24 * 60 * 60 * 1000;

    const evaluations = await ctx.db
      .query("ai_evaluations")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("evaluatedAt"), cutoff))
      .collect();

    const total = evaluations.length;
    if (total === 0) return null;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    return {
      total,
      avgHallucinationScore: sum(evaluations.map((e) => e.hallucinationScore)) / total,
      avgConfidenceScore: sum(evaluations.map((e) => e.confidenceScore)) / total,
      avgRelevanceScore: sum(evaluations.map((e) => e.relevanceScore)) / total,
      avgAccuracyScore: sum(evaluations.map((e) => e.accuracyScore)) / total,
      avgQualityScore: sum(evaluations.map((e) => e.qualityScore)) / total,
      hallucinationsDetected: evaluations.filter((e) => e.hasHallucination).length,
      needsReview: evaluations.filter((e) => e.needsReview).length,
      withCustomerFeedback: evaluations.filter((e) => e.customerRating).length,
    };
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const evaluateResponse = action({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    query: v.string(),
    response: v.string(),
    expectedResponse: v.optional(v.string()),
    sourcesUsed: v.optional(v.array(v.string())),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
  },
  handler: async (ctx, args) => {
    const evaluation = await evaluateWithAI(
      args.query,
      args.response,
      args.expectedResponse,
      args.sourcesUsed,
      args.provider
    );

    const evaluationId = await ctx.runMutation(internal.evaluation.evaluator.saveEvaluation, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      query: args.query,
      response: args.response,
      expectedResponse: args.expectedResponse,
      sourcesUsed: args.sourcesUsed,
      ...evaluation,
    });

    // Flag if needs review
    if (evaluation.needsReview) {
      // TODO: Trigger notification
    }

    return evaluationId;
  },
});

export const generateQualityReport = action({
  args: {
    orgId: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
    reportType: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluations = await ctx.runQuery(internal.evaluation.evaluator.getEvaluationsForReport, {
      orgId: args.orgId,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    });

    if (evaluations.length === 0) {
      throw new Error("No evaluations found for this period");
    }

    const report = analyzeEvaluations(evaluations);

    return await ctx.runMutation(internal.evaluation.evaluator.saveReport, {
      orgId: args.orgId,
      reportType: args.reportType as any,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      ...report,
    });
  },
});

// ─── Internal ───────────────────────────────────────────────────────────────

export const saveEvaluation = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    responseType: v.union(v.literal("ai"), v.literal("human")),
    query: v.string(),
    response: v.string(),
    expectedResponse: v.optional(v.string()),
    sourcesUsed: v.optional(v.array(v.string())),
    hallucinationScore: v.number(),
    confidenceScore: v.number(),
    relevanceScore: v.number(),
    accuracyScore: v.number(),
    qualityScore: v.number(),
    hasHallucination: v.boolean(),
    needsReview: v.boolean(),
    evaluatorModel: v.string(),
    tokensUsed: v.number(),
    costUSD: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ai_evaluations", {
      ...args,
      evaluatedBy: "ai",
      evaluationMethod: "llm-as-judge",
      evaluatedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const getEvaluationsForReport = query({
  args: {
    orgId: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args) => {
    const from = new Date(args.dateFrom).getTime();
    const to = new Date(args.dateTo).getTime();

    return await ctx.db
      .query("ai_evaluations")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(q.gte(q.field("evaluatedAt"), from), q.lte(q.field("evaluatedAt"), to))
      )
      .collect();
  },
});

export const saveReport = internalMutation({
  args: {
    orgId: v.string(),
    reportType: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
    totalEvaluations: v.number(),
    avgHallucinationScore: v.number(),
    avgConfidenceScore: v.number(),
    avgRelevanceScore: v.number(),
    avgAccuracyScore: v.number(),
    avgQualityScore: v.number(),
    hallucinationsDetected: v.number(),
    responsesNeedingReview: v.number(),
    lowConfidenceResponses: v.number(),
    avgCustomerRating: v.optional(v.number()),
    totalCustomerRatings: v.number(),
    improvementRate: v.optional(v.number()),
    topIssues: v.array(v.object({ issue: v.string(), count: v.number(), severity: v.string() })),
    recommendations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("evaluation_reports", {
      ...args,
      reportType: args.reportType as any,
      createdAt: Date.now(),
    });
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

async function evaluateWithAI(
  query: string,
  response: string,
  expectedResponse?: string,
  sources?: string[],
  provider: "openai" | "anthropic" = "openai"
): Promise<{
  responseType: "ai" | "human";
  hallucinationScore: number;
  confidenceScore: number;
  relevanceScore: number;
  accuracyScore: number;
  qualityScore: number;
  hasHallucination: boolean;
  needsReview: boolean;
  evaluatorModel: string;
  tokensUsed: number;
  costUSD: number;
}> {
  const prompt = `Evaluate this AI response:

Query: ${query}
Response: ${response}
${expectedResponse ? `Expected: ${expectedResponse}` : ""}
${sources ? `Sources: ${sources.join(", ")}` : ""}

Score (0-1) for:
1. Hallucination (lower better)
2. Confidence
3. Relevance
4. Accuracy
5. Overall Quality

Return JSON with scores and flags.`;

  try {
    if (provider === "openai") {
      const result = await evaluateWithOpenAI(prompt);
      return result;
    } else {
      const result = await evaluateWithAnthropic(prompt);
      return result;
    }
  } catch (error) {
    // Fallback to heuristic evaluation
    return heuristicEvaluation(query, response, expectedResponse);
  }
}

async function evaluateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  const qualityScore =
    (content.confidence + content.relevance + content.accuracy + (1 - content.hallucination)) / 4;

  return {
    responseType: "ai" as const,
    hallucinationScore: content.hallucination,
    confidenceScore: content.confidence,
    relevanceScore: content.relevance,
    accuracyScore: content.accuracy,
    qualityScore,
    hasHallucination: content.hallucination > 0.3,
    needsReview: content.hallucination > 0.3 || content.confidence < 0.7,
    evaluatorModel: "gpt-4",
    tokensUsed: data.usage.total_tokens,
    costUSD: (data.usage.total_tokens / 1000) * 0.03,
  };
}

async function evaluateWithAnthropic(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const content = JSON.parse(data.content[0].text);

  const qualityScore =
    (content.confidence + content.relevance + content.accuracy + (1 - content.hallucination)) / 4;

  return {
    responseType: "ai" as const,
    hallucinationScore: content.hallucination,
    confidenceScore: content.confidence,
    relevanceScore: content.relevance,
    accuracyScore: content.accuracy,
    qualityScore,
    hasHallucination: content.hallucination > 0.3,
    needsReview: content.hallucination > 0.3 || content.confidence < 0.7,
    evaluatorModel: "claude-3-sonnet",
    tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    costUSD: ((data.usage.input_tokens * 0.003 + data.usage.output_tokens * 0.015) / 1000),
  };
}

function heuristicEvaluation(query: string, response: string, expected?: string) {
  // Simple heuristic evaluation
  const relevance = calculateRelevance(query, response);
  const confidence = response.length > 50 ? 0.7 : 0.5;
  const accuracy = expected ? calculateSimilarity(response, expected) : 0.7;
  const hallucination = hasCommonHallucinationPatterns(response) ? 0.6 : 0.2;

  const quality = (confidence + relevance + accuracy + (1 - hallucination)) / 4;

  return {
    responseType: "ai" as const,
    hallucinationScore: hallucination,
    confidenceScore: confidence,
    relevanceScore: relevance,
    accuracyScore: accuracy,
    qualityScore: quality,
    hasHallucination: hallucination > 0.3,
    needsReview: hallucination > 0.3 || confidence < 0.7,
    evaluatorModel: "heuristic",
    tokensUsed: 0,
    costUSD: 0,
  };
}

function calculateRelevance(query: string, response: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const responseWords = response.toLowerCase().split(/\s+/);
  const overlap = queryWords.filter((w) => responseWords.includes(w)).length;
  return Math.min(overlap / queryWords.length, 1);
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

function hasCommonHallucinationPatterns(response: string): boolean {
  const patterns = [
    /I (don't|do not) have access/i,
    /as an AI/i,
    /I cannot/i,
    /I'm not sure/i,
    /I think/i,
    /probably/i,
    /might be/i,
  ];
  return patterns.some((p) => p.test(response));
}

function analyzeEvaluations(evaluations: any[]) {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const total = evaluations.length;

  const topIssues = [];
  const hallucinationsCount = evaluations.filter((e) => e.hasHallucination).length;
  if (hallucinationsCount > 0) {
    topIssues.push({
      issue: "Hallucinations detected",
      count: hallucinationsCount,
      severity: hallucinationsCount > total * 0.1 ? "high" : "medium",
    });
  }

  const lowConfidence = evaluations.filter((e) => e.confidenceScore < 0.7).length;
  if (lowConfidence > 0) {
    topIssues.push({
      issue: "Low confidence responses",
      count: lowConfidence,
      severity: lowConfidence > total * 0.2 ? "high" : "medium",
    });
  }

  const recommendations = [];
  if (hallucinationsCount > total * 0.05) {
    recommendations.push("Review AI training data and reduce hallucination rate");
  }
  if (lowConfidence > total * 0.15) {
    recommendations.push("Improve response confidence with better context");
  }

  const avgCustomerRating = evaluations.filter((e) => e.customerRating).length > 0
    ? sum(evaluations.filter((e) => e.customerRating).map((e) => e.customerRating!)) /
      evaluations.filter((e) => e.customerRating).length
    : undefined;

  return {
    totalEvaluations: total,
    avgHallucinationScore: sum(evaluations.map((e) => e.hallucinationScore)) / total,
    avgConfidenceScore: sum(evaluations.map((e) => e.confidenceScore)) / total,
    avgRelevanceScore: sum(evaluations.map((e) => e.relevanceScore)) / total,
    avgAccuracyScore: sum(evaluations.map((e) => e.accuracyScore)) / total,
    avgQualityScore: sum(evaluations.map((e) => e.qualityScore)) / total,
    hallucinationsDetected: hallucinationsCount,
    responsesNeedingReview: evaluations.filter((e) => e.needsReview).length,
    lowConfidenceResponses: lowConfidence,
    avgCustomerRating,
    totalCustomerRatings: evaluations.filter((e) => e.customerRating).length,
    improvementRate: undefined,
    topIssues,
    recommendations,
  };
}
