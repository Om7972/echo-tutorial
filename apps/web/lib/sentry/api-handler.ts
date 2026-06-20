/**
 * Utility: withSentryApiHandler
 *
 * Wraps a Next.js 15 App Router Route Handler with Sentry error capturing.
 * Any unhandled exception is captured before being re-thrown, so the caller
 * still receives a proper HTTP 500 response.
 *
 * Usage (app/api/example/route.ts):
 *
 *   import { withSentryApiHandler } from "@/lib/sentry/api-handler";
 *   import { NextRequest, NextResponse } from "next/server";
 *
 *   export const GET = withSentryApiHandler(async (req: NextRequest) => {
 *     // ... your logic
 *     return NextResponse.json({ ok: true });
 *   }, { routeName: "GET /api/example" });
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  req: NextRequest,
  context?: unknown
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  /** A human-readable label for this route (shown in Sentry issues) */
  routeName: string;
}

export function withSentryApiHandler(
  handler: RouteHandler,
  { routeName }: ApiHandlerOptions
): RouteHandler {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    try {
      return await Sentry.startSpan(
        { op: "http.server", name: routeName },
        () => handler(req, context)
      );
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("api.route", routeName);
        scope.setContext("HTTP Request", {
          method: req.method,
          url: req.url,
          route: routeName,
        });
        scope.setLevel("error");
        Sentry.captureException(error);
      });

      // Return a generic 500 instead of leaking internal details
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? String(error)
              : "An unexpected error occurred.",
        },
        { status: 500 }
      );
    }
  };
}
