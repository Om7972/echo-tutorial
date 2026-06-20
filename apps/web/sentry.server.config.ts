/**
 * Sentry server-side (Node.js) instrumentation.
 * Loaded automatically by Next.js for server components, API routes,
 * and Server Actions.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";
import { SENTRY_CONFIG } from "@/lib/sentry/config";

Sentry.init({
  ...SENTRY_CONFIG,

  integrations: [
    // Automatic Node.js HTTP instrumentation
    Sentry.httpIntegration(),
  ],

  // Exclude noisy internal Next.js routes from traces
  ignoreTransactions: [
    /\/_next\//,
    /\/favicon\.ico/,
    /\/__nextjs_original-stack-frame/,
  ],
});
