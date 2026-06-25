// @ts-nocheck
/**
 * Shared Sentry configuration used by client, server, and edge runtimes.
 * Centralizes DSN, release, environment, and sampling rates.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const SENTRY_CONFIG = {
  dsn: SENTRY_DSN,

  // Release tied to deployment; injected via CI or Vercel env var
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "development",

  // Environment tag: production | staging | development
  environment: process.env.NODE_ENV === "production" ? "production" : "development",

  // Capture 100% of transactions in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture all replays on error, 10% otherwise
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Breadcrumbs configuration
  maxBreadcrumbs: 50,

  // Attach stack traces to all captured messages
  attachStacktrace: true,

  // Do not send PII (personally identifiable information) by default;
  // user context is attached explicitly via setUser()
  sendDefaultPii: false,

  // Debug Sentry itself only in development
  debug: process.env.NODE_ENV === "development",
} as const;

/** Custom tag keys for consistent labeling across all events */
export const SENTRY_TAGS = {
  WORKSPACE: "workspace",
  CONVERSATION_ID: "conversationId",
  WIDGET_SESSION: "widgetSession",
  APP: "app",
  RUNTIME: "runtime",
} as const;
