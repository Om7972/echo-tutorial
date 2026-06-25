// @ts-nocheck
/**
 * Performance monitoring helpers for page transitions, server latency,
 * and API response times.
 *
 * Built on top of Sentry's `startSpan` / `startInactiveSpan` primitives.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Page Transitions ───────────────────────────────────────────────────────

/**
 * Measures and records how long a page transition takes.
 *
 * @example
 * const finish = measurePageTransition("/dashboard");
 * // ... navigation happens ...
 * finish();
 */
export function measurePageTransition(
  pathname: string
): () => void {
  const span = Sentry.startInactiveSpan({
    op: "navigation",
    name: `Page transition → ${pathname}`,
    attributes: { pathname },
  });

  return () => {
    span.end();
  };
}

// ─── Server Latency ──────────────────────────────────────────────────────────

/**
 * Wraps a server-side async operation and records its latency as a span.
 *
 * @example
 * const data = await measureServerLatency("fetchUser", () => db.user.findFirst());
 */
export async function measureServerLatency<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    { op: "db", name: `Server: ${name}` },
    () => fn()
  );
}

// ─── API Response Times ──────────────────────────────────────────────────────

/**
 * Wraps a fetch (or any async HTTP call) and records the response time.
 *
 * @example
 * const res = await measureApiCall("POST /api/chat", () => fetch("/api/chat", options));
 */
export async function measureApiCall<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    { op: "http.client", name: `API: ${label}` },
    () => fn()
  );
}

// ─── Convex Query Timing ─────────────────────────────────────────────────────

/**
 * Records how long a Convex query/mutation takes.
 *
 * @example
 * const users = await measureConvexCall("api.users.getMany", () => convex.query(api.users.getMany));
 */
export async function measureConvexCall<T>(
  functionName: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    { op: "convex.query", name: `Convex: ${functionName}` },
    () => fn()
  );
}
