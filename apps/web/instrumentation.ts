// @ts-nocheck
/**
 * Next.js 15 Instrumentation Hook
 *
 * This file is the OFFICIAL entry point for Sentry in Next.js 15.
 * Next.js calls `register()` once per runtime (Node.js, Edge) before
 * the app starts serving requests.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Node.js (server components, API routes, Server Actions)
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime (middleware, edge API routes)
    await import("./sentry.edge.config");
  }
}

/**
 * onRequestError is called by Next.js 15 whenever an unhandled error
 * occurs during a server request. This ensures Server Action errors
 * and RSC render errors are always captured, even without a try/catch.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
 */
export const onRequestError =
  // Dynamic import keeps the bundle lean; Sentry is only required at runtime.
  async (
    error: { digest: string } & Error,
    request: {
      path: string;
      method: string;
      headers: Record<string, string>;
    },
    context: {
      routerKind: string;
      routePath: string;
      routeType: string;
      renderSource?: string;
      revalidateURL?: string;
    }
  ) => {
    const { captureRequestError } = await import("@sentry/nextjs");
    captureRequestError(error, request, context);
  };
