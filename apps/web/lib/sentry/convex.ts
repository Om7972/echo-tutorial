/**
 * Convex-specific Sentry integration helpers.
 *
 * Wrap Convex query/mutation/action calls so that any thrown
 * ConvexError or unexpected exception is captured with full context.
 */

import * as Sentry from "@sentry/nextjs";

export interface ConvexErrorContext {
  /** The Convex function name, e.g. "api.users.getMany" */
  functionName: string;
  /** Optional arguments (will be sanitized before attaching) */
  args?: Record<string, unknown>;
}

/**
 * Wraps a Convex call and captures any thrown error in Sentry with
 * rich context. Re-throws so the caller can handle it as well.
 *
 * @example
 * const data = await captureConvexError(
 *   () => convex.query(api.users.getMany),
 *   { functionName: "api.users.getMany" }
 * );
 */
export async function captureConvexError<T>(
  fn: () => Promise<T>,
  context: ConvexErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("convex.function", context.functionName);
      scope.setContext("Convex", {
        function: context.functionName,
        // Strip sensitive values from args
        args: context.args ? sanitizeArgs(context.args) : undefined,
      });
      scope.setLevel("error");
      Sentry.captureException(error);
    });
    throw error;
  }
}

/**
 * Reports a Convex exception without re-throwing.
 * Useful inside catch blocks where you still want to log but not escalate.
 */
export function reportConvexError(
  error: unknown,
  context: ConvexErrorContext
): void {
  Sentry.withScope((scope) => {
    scope.setTag("convex.function", context.functionName);
    scope.setContext("Convex", {
      function: context.functionName,
      args: context.args ? sanitizeArgs(context.args) : undefined,
    });
    scope.setLevel("error");
    Sentry.captureException(error);
  });
}

/** Remove keys that may contain tokens, passwords, or PII */
function sanitizeArgs(
  args: Record<string, unknown>
): Record<string, unknown> {
  const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "secret",
    "key",
    "apiKey",
    "authorization",
  ]);
  return Object.fromEntries(
    Object.entries(args).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v,
    ])
  );
}
