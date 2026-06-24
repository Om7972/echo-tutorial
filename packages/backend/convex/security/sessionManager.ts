/**
 * Session Management System
 * Secure session handling with device tracking
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Configuration ──────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || "1800000"); // 30 minutes
const SESSION_MAX_AGE_MS = parseInt(process.env.SESSION_MAX_AGE_MS || "86400000"); // 24 hours

// ─── Queries ────────────────────────────────────────────────────────────────

export const validateSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    const now = Date.now();

    // Check if expired
    if (session.expiresAt < now) {
      return { valid: false, reason: "Session expired" };
    }

    // Check if inactive
    if (now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
      return { valid: false, reason: "Session timed out due to inactivity" };
    }

    // Check if not active
    if (!session.isActive) {
      return { valid: false, reason: "Session terminated" };
    }

    return {
      valid: true,
      session: {
        userId: session.userId,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
      },
    };
  },
});

export const getUserSessions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get device info for each session
    const sessionsWithDevices = await Promise.all(
      sessions.map(async (session) => {
        const device = await ctx.db
          .query("device_tracking")
          .withIndex("by_device_id", (q) => q.eq("deviceId", session.deviceId))
          .first();

        return {
          ...session,
          device,
        };
      })
    );

    return sessionsWithDevices;
  },
});

export const getDevices = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const devices = await ctx.db
      .query("device_tracking")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return devices;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const createSession = mutation({
  args: {
    userId: v.string(),
    deviceId: v.string(),
    deviceFingerprint: v.string(),
    ipAddress: v.string(),
    userAgent: v.string(),
    browser: v.string(),
    os: v.string(),
    deviceType: v.union(v.literal("desktop"), v.literal("mobile"), v.literal("tablet")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionToken = generateSessionToken();
    const expiresAt = now + SESSION_MAX_AGE_MS;

    // Track device
    let device = await ctx.db
      .query("device_tracking")
      .withIndex("by_device_id", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (device) {
      // Update existing device
      await ctx.db.patch(device._id, {
        lastSeenAt: now,
        ipAddress: args.ipAddress,
      });
    } else {
      // Create new device
      await ctx.db.insert("device_tracking", {
        userId: args.userId,
        deviceId: args.deviceId,
        deviceFingerprint: args.deviceFingerprint,
        userAgent: args.userAgent,
        browser: args.browser,
        os: args.os,
        deviceType: args.deviceType,
        ipAddress: args.ipAddress,
        isTrusted: false, // User must verify new devices
        lastSeenAt: now,
        createdAt: now,
      });
    }

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      sessionToken,
      deviceId: args.deviceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      expiresAt,
      isActive: true,
      lastActivityAt: now,
      createdAt: now,
    });

    return {
      sessionId,
      sessionToken,
      expiresAt,
    };
  },
});

export const updateSessionActivity = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

export const terminateSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      isActive: false,
    });

    // Log security event
    await ctx.db.insert("security_events", {
      eventType: "invalid_session",
      severity: "low",
      ipAddress: session.ipAddress,
      userId: session.userId,
      userAgent: session.userAgent,
      endpoint: "/auth/logout",
      isBlocked: false,
      detectionMethod: "manual",
      details: {
        action: "session_terminated",
        sessionId: session._id,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const terminateAllUserSessions = mutation({
  args: {
    userId: v.string(),
    exceptSessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let terminated = 0;
    for (const session of sessions) {
      if (args.exceptSessionToken && session.sessionToken === args.exceptSessionToken) {
        continue;
      }

      await ctx.db.patch(session._id, {
        isActive: false,
      });
      terminated++;
    }

    return { terminated };
  },
});

export const trustDevice = mutation({
  args: {
    deviceId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("device_tracking")
      .withIndex("by_device_id", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.userId !== args.userId) {
      throw new Error("Device does not belong to user");
    }

    await ctx.db.patch(device._id, {
      isTrusted: true,
    });

    return { success: true };
  },
});

export const removeDevice = mutation({
  args: {
    deviceId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("device_tracking")
      .withIndex("by_device_id", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.userId !== args.userId) {
      throw new Error("Device does not belong to user");
    }

    // Terminate all sessions on this device
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_device_id", (q) => q.eq("deviceId", args.deviceId))
      .collect();

    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }

    // Delete device
    await ctx.db.delete(device._id);

    return { success: true, sessionsTerminated: sessions.length };
  },
});

export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired sessions
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    // Also find inactive sessions
    const inactiveCutoff = now - SESSION_TIMEOUT_MS;
    const inactiveSessions = await ctx.db
      .query("sessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.lt(q.field("lastActivityAt"), inactiveCutoff)
        )
      )
      .collect();

    const allToClean = [...expiredSessions, ...inactiveSessions];

    for (const session of allToClean) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }

    return { cleaned: allToClean.length };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  // In production, use crypto.randomBytes or similar
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sess_${token}_${Date.now()}`;
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(params: {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
}): string {
  const data = JSON.stringify(params);
  // In production, use a proper hashing function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Parse user agent
 */
export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
} {
  // Simple parsing - in production use a library like ua-parser-js
  const isMobile = /mobile/i.test(userAgent);
  const isTablet = /tablet|ipad/i.test(userAgent);

  let browser = "Unknown";
  if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/edge/i.test(userAgent)) browser = "Edge";

  let os = "Unknown";
  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/mac/i.test(userAgent)) os = "macOS";
  else if (/linux/i.test(userAgent)) os = "Linux";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/ios/i.test(userAgent)) os = "iOS";

  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  return { browser, os, deviceType };
}
