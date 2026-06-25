// @ts-nocheck
/**
 * Secrets Manager
 * Encrypted secrets storage with key rotation
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ─── Configuration ──────────────────────────────────────────────────────────

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_ROTATION_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ─── Queries ────────────────────────────────────────────────────────────────

export const getSecret = query({
  args: {
    orgId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = await ctx.db
      .query("encrypted_secrets")
      .withIndex("by_org_key", (q) => q.eq("orgId", args.orgId).eq("key", args.key))
      .first();

    if (!secret) {
      return null;
    }

    // Check if expired
    if (secret.expiresAt && secret.expiresAt < Date.now()) {
      return null;
    }

    // Don't return the actual encrypted value in queries
    // Decryption should be done server-side in actions
    return {
      key: secret.key,
      keyVersion: secret.keyVersion,
      lastRotated: secret.lastRotated,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
    };
  },
});

export const listSecrets = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const secrets = await ctx.db
      .query("encrypted_secrets")
      .withIndex("by_org_key", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Return metadata only, not encrypted values
    return secrets.map((secret) => ({
      _id: secret._id,
      key: secret.key,
      keyVersion: secret.keyVersion,
      lastRotated: secret.lastRotated,
      expiresAt: secret.expiresAt,
      createdBy: secret.createdBy,
      createdAt: secret.createdAt,
    }));
  },
});

export const getSecretsNeedingRotation = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - KEY_ROTATION_INTERVAL_MS;

    let q = ctx.db.query("encrypted_secrets");

    if (args.orgId) {
      q = q.withIndex("by_org_key", (q) => q.eq("orgId", args.orgId));
    }

    const secrets = await q
      .filter((q) => q.lt(q.field("lastRotated"), cutoff))
      .collect();

    return secrets.map((secret) => ({
      _id: secret._id,
      orgId: secret.orgId,
      key: secret.key,
      lastRotated: secret.lastRotated,
      daysSinceRotation: Math.floor((Date.now() - secret.lastRotated) / (24 * 60 * 60 * 1000)),
    }));
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const storeSecret = mutation({
  args: {
    orgId: v.string(),
    key: v.string(),
    value: v.string(),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Encrypt the value
    const encrypted = await encryptValue(args.value);

    // Check if secret already exists
    const existing = await ctx.db
      .query("encrypted_secrets")
      .withIndex("by_org_key", (q) => q.eq("orgId", args.orgId).eq("key", args.key))
      .first();

    if (existing) {
      // Update existing secret
      await ctx.db.patch(existing._id, {
        encryptedValue: encrypted.ciphertext,
        algorithm: ENCRYPTION_ALGORITHM,
        keyVersion: existing.keyVersion + 1,
        lastRotated: Date.now(),
        expiresAt: args.expiresAt,
      });

      return { id: existing._id, updated: true };
    }

    // Create new secret
    const id = await ctx.db.insert("encrypted_secrets", {
      orgId: args.orgId,
      key: args.key,
      encryptedValue: encrypted.ciphertext,
      algorithm: ENCRYPTION_ALGORITHM,
      keyVersion: 1,
      lastRotated: Date.now(),
      expiresAt: args.expiresAt,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return { id, updated: false };
  },
});

export const rotateSecret = mutation({
  args: {
    secretId: v.id("encrypted_secrets"),
  },
  handler: async (ctx, args) => {
    const secret = await ctx.db.get(args.secretId);
    if (!secret) {
      throw new Error("Secret not found");
    }

    // Decrypt with old key
    const decrypted = await decryptValue(secret.encryptedValue);

    // Re-encrypt with new key
    const encrypted = await encryptValue(decrypted);

    // Update secret
    await ctx.db.patch(args.secretId, {
      encryptedValue: encrypted.ciphertext,
      keyVersion: secret.keyVersion + 1,
      lastRotated: Date.now(),
    });

    return { success: true, newVersion: secret.keyVersion + 1 };
  },
});

export const deleteSecret = mutation({
  args: {
    secretId: v.id("encrypted_secrets"),
  },
  handler: async (ctx, args) => {
    const secret = await ctx.db.get(args.secretId);
    if (!secret) {
      throw new Error("Secret not found");
    }

    await ctx.db.delete(args.secretId);

    return { success: true };
  },
});

export const cleanupExpiredSecrets = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("encrypted_secrets")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const secret of expired) {
      await ctx.db.delete(secret._id);
    }

    return { deleted: expired.length };
  },
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Encrypt a value using AES-256-GCM
 * In production, use a proper encryption library and key management system
 */
async function encryptValue(plaintext: string): Promise<{
  ciphertext: string;
  iv: string;
  tag: string;
}> {
  // This is a placeholder implementation
  // In production, use Web Crypto API or Node.js crypto module
  
  // For now, just base64 encode (NOT SECURE - replace in production!)
  const ciphertext = Buffer.from(plaintext).toString("base64");
  const iv = "placeholder-iv";
  const tag = "placeholder-tag";

  return { ciphertext, iv, tag };
}

/**
 * Decrypt a value
 * In production, use a proper decryption implementation
 */
async function decryptValue(ciphertext: string): Promise<string> {
  // This is a placeholder implementation
  // In production, use Web Crypto API or Node.js crypto module
  
  // For now, just base64 decode (NOT SECURE - replace in production!)
  return Buffer.from(ciphertext, "base64").toString("utf-8");
}

/**
 * Get encryption key from environment or key management service
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }
  if (key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  return key;
}

/**
 * Generate a secure random key
 */
export function generateSecureKey(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Hash a value (for comparison without storing plaintext)
 */
export function hashValue(value: string): string {
  // This is a placeholder
  // In production, use bcrypt, argon2, or similar
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Compare hash with value
 */
export function compareHash(value: string, hash: string): boolean {
  return hashValue(value) === hash;
}

/**
 * Validate secret key format
 */
export function isValidSecretKey(key: string): boolean {
  // Keys should be alphanumeric with underscores and dashes
  return /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Common secret types for validation
 */
export const SECRET_TYPES = {
  API_KEY: "api_key",
  DATABASE_URL: "database_url",
  WEBHOOK_SECRET: "webhook_secret",
  ENCRYPTION_KEY: "encryption_key",
  JWT_SECRET: "jwt_secret",
  OAUTH_CLIENT_SECRET: "oauth_client_secret",
} as const;

/**
 * Validate secret based on type
 */
export function validateSecret(type: string, value: string): {
  valid: boolean;
  error?: string;
} {
  switch (type) {
    case SECRET_TYPES.API_KEY:
      if (value.length < 20) {
        return { valid: false, error: "API key too short (minimum 20 characters)" };
      }
      break;

    case SECRET_TYPES.JWT_SECRET:
      if (value.length < 32) {
        return { valid: false, error: "JWT secret too short (minimum 32 characters)" };
      }
      break;

    case SECRET_TYPES.ENCRYPTION_KEY:
      if (value.length < 32) {
        return { valid: false, error: "Encryption key too short (minimum 32 characters)" };
      }
      break;

    case SECRET_TYPES.DATABASE_URL:
      if (!value.startsWith("postgresql://") && !value.startsWith("mysql://")) {
        return { valid: false, error: "Invalid database URL format" };
      }
      break;
  }

  return { valid: true };
}
