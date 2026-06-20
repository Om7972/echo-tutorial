/**
 * Sentry Edge Runtime instrumentation.
 * Loaded for middleware and any routes using `export const runtime = "edge"`.
 *
 * NOTE: The Edge runtime has no Node.js APIs, so keep this config lean.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";
import { SENTRY_CONFIG } from "@/lib/sentry/config";

Sentry.init({
  dsn: SENTRY_CONFIG.dsn,
  release: SENTRY_CONFIG.release,
  environment: SENTRY_CONFIG.environment,
  tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
  attachStacktrace: SENTRY_CONFIG.attachStacktrace,

  // Edge-safe: no Node-specific integrations
  integrations: [],
});
