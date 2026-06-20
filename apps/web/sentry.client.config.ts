/**
 * Sentry client-side instrumentation.
 * This file is loaded by Next.js automatically when placed at the project root
 * and referenced in next.config.mjs via `sentry.autoInstrumentClientFiles`.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";
import { SENTRY_CONFIG } from "@/lib/sentry/config";

Sentry.init({
  ...SENTRY_CONFIG,

  integrations: [
    // Capture session replays for error debugging
    Sentry.replayIntegration({
      // Mask all text and inputs to protect user PII in replays
      maskAllText: true,
      blockAllMedia: false,
    }),

    // Track page navigation performance
    Sentry.browserTracingIntegration({
      // Automatically instrument fetch / XHR calls
      traceFetch: true,
      traceXHR: true,
    }),
  ],

  // Replay sample rates (mirrored from config for explicit reference)
  replaysSessionSampleRate: SENTRY_CONFIG.replaysSessionSampleRate,
  replaysOnErrorSampleRate: SENTRY_CONFIG.replaysOnErrorSampleRate,
});
