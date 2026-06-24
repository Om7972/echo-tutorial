/**
 * Bot Detection System
 * Identify and block automated bot traffic
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ─── Configuration ──────────────────────────────────────────────────────────

interface BotSignature {
  name: string;
  patterns: RegExp[];
  severity: "low" | "medium" | "high";
}

const KNOWN_BOT_SIGNATURES: BotSignature[] = [
  {
    name: "Crawler Bots",
    patterns: [
      /googlebot/i,
      /bingbot/i,
      /yahoo! slurp/i,
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
    ],
    severity: "low", // Legitimate crawlers
  },
  {
    name: "Scraping Bots",
    patterns: [
      /scrapy/i,
      /python-requests/i,
      /wget/i,
      /curl/i,
      /httpie/i,
      /axios/i,
      /node-fetch/i,
    ],
    severity: "medium",
  },
  {
    name: "Malicious Bots",
    patterns: [
      /semrush/i,
      /ahrefsbot/i,
      /dotbot/i,
      /rogerbot/i,
      /exabot/i,
      /mj12bot/i,
      /blexbot/i,
    ],
    severity: "high",
  },
  {
    name: "Headless Browsers",
    patterns: [/headless/i, /phantomjs/i, /selenium/i, /puppeteer/i, /playwright/i],
    severity: "high",
  },
];

// ─── Bot Detection Logic ────────────────────────────────────────────────────

interface BotCheckParams {
  userAgent: string;
  ipAddress: string;
  requestPattern?: {
    requestsPerMinute: number;
    distinctEndpoints: number;
    avgResponseTime: number;
  };
  browserFingerprint?: string;
}

interface BotDetectionResult {
  isBot: boolean;
  botType?: string;
  confidence: number; // 0-1
  reasons: string[];
  severity: "low" | "medium" | "high";
  shouldBlock: boolean;
}

export function detectBot(params: BotCheckParams): BotDetectionResult {
  const reasons: string[] = [];
  let confidence = 0;
  let botType = "unknown";
  let severity: "low" | "medium" | "high" = "low";

  // Check user agent against known signatures
  for (const signature of KNOWN_BOT_SIGNATURES) {
    for (const pattern of signature.patterns) {
      if (pattern.test(params.userAgent)) {
        reasons.push(`Matched ${signature.name} signature`);
        confidence = Math.max(confidence, 0.9);
        botType = signature.name;
        severity = signature.severity;
        break;
      }
    }
  }

  // Check for missing or suspicious user agent
  if (!params.userAgent || params.userAgent.length < 10) {
    reasons.push("Missing or suspiciously short user agent");
    confidence = Math.max(confidence, 0.7);
  }

  // Check request patterns
  if (params.requestPattern) {
    const { requestsPerMinute, distinctEndpoints, avgResponseTime } = params.requestPattern;

    // Too many requests per minute
    if (requestsPerMinute > 60) {
      reasons.push(`High request rate: ${requestsPerMinute} req/min`);
      confidence = Math.max(confidence, 0.8);
    }

    // Accessing too many distinct endpoints
    if (distinctEndpoints > 50) {
      reasons.push(`High endpoint diversity: ${distinctEndpoints} endpoints`);
      confidence = Math.max(confidence, 0.7);
    }

    // Very fast response times (bot not waiting for page load)
    if (avgResponseTime < 100) {
      reasons.push(`Suspiciously fast responses: ${avgResponseTime}ms avg`);
      confidence = Math.max(confidence, 0.6);
    }
  }

  // Check for missing browser fingerprint
  if (!params.browserFingerprint) {
    reasons.push("Missing browser fingerprint");
    confidence = Math.max(confidence, 0.5);
  }

  const isBot = confidence > 0.5;
  const shouldBlock = confidence > 0.7 && severity !== "low";

  return {
    isBot,
    botType: isBot ? botType : undefined,
    confidence,
    reasons,
    severity,
    shouldBlock,
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export const checkBot = query({
  args: {
    userAgent: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const result = detectBot({
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    return result;
  },
});

export const getBotStats = query({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.hours || 24) * 60 * 60 * 1000;

    const botEvents = await ctx.db
      .query("security_events")
      .withIndex("by_event_type", (q) => q.eq("eventType", "bot_detected"))
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const event of botEvents) {
      const botType = event.details?.botType || "unknown";
      byType[botType] = (byType[botType] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    }

    return {
      total: botEvents.length,
      blocked: botEvents.filter((e) => e.isBlocked).length,
      byType,
      bySeverity,
      recentEvents: botEvents.slice(0, 20),
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const recordBotDetection = mutation({
  args: {
    orgId: v.optional(v.string()),
    ipAddress: v.string(),
    userAgent: v.string(),
    endpoint: v.string(),
    botType: v.string(),
    confidence: v.number(),
    reasons: v.array(v.string()),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    shouldBlock: v.boolean(),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("security_events", {
      orgId: args.orgId,
      eventType: "bot_detected",
      severity: args.severity === "high" ? "high" : "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      endpoint: args.endpoint,
      isBlocked: args.shouldBlock,
      blockDuration: args.shouldBlock ? 3600000 : undefined, // 1 hour
      detectionMethod: "bot_detector",
      details: {
        botType: args.botType,
        confidence: args.confidence,
        reasons: args.reasons,
      },
      timestamp: Date.now(),
    });

    // Add to IP blacklist if should block
    if (args.shouldBlock && args.orgId) {
      const existing = await ctx.db
        .query("ip_restrictions")
        .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
        .first();

      if (!existing) {
        await ctx.db.insert("ip_restrictions", {
          orgId: args.orgId,
          ipAddress: args.ipAddress,
          type: "blacklist",
          reason: `Bot detected: ${args.botType} (confidence: ${(args.confidence * 100).toFixed(0)}%)`,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          createdBy: "system",
          createdAt: Date.now(),
        });
      }
    }

    return { eventId, blocked: args.shouldBlock };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Check if IP is from a known bot
 */
export function isKnownBot(userAgent: string): boolean {
  return KNOWN_BOT_SIGNATURES.some((signature) =>
    signature.patterns.some((pattern) => pattern.test(userAgent))
  );
}

/**
 * Get bot risk level
 */
export function getBotRiskLevel(confidence: number): "low" | "medium" | "high" | "critical" {
  if (confidence >= 0.9) return "critical";
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/**
 * Calculate request pattern anomaly score
 */
export function calculateAnomalyScore(params: {
  requestsPerMinute: number;
  distinctEndpoints: number;
  avgResponseTime: number;
  timeOfDay: number; // 0-23
}): number {
  let score = 0;

  // High request rate
  if (params.requestsPerMinute > 60) score += 0.3;
  else if (params.requestsPerMinute > 30) score += 0.2;

  // High endpoint diversity
  if (params.distinctEndpoints > 50) score += 0.3;
  else if (params.distinctEndpoints > 25) score += 0.2;

  // Fast response times
  if (params.avgResponseTime < 100) score += 0.2;
  else if (params.avgResponseTime < 200) score += 0.1;

  // Suspicious time (e.g., 2-5 AM)
  if (params.timeOfDay >= 2 && params.timeOfDay <= 5) score += 0.1;

  return Math.min(score, 1);
}
