"use client";

/**
 * app/(dashboard)/error.tsx
 *
 * Dashboard-level error boundary (route segment level).
 * Catches errors from dashboard page.tsx and its sub-components.
 * Uses the shared ErrorBoundary UI but wired to Next.js's reset() callback.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary } from "@/components/error-boundary";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("boundary.level", "dashboard");
      scope.setTag("boundary.label", "DashboardError");
      if (error.digest) {
        scope.setTag("error.digest", error.digest);
      }
      scope.setLevel("error");
      Sentry.captureException(error);
    });
  }, [error]);

  // Delegate rendering to the shared ErrorBoundary fallback UI
  // by wrapping a never-erroring component and using the fallback prop.
  return (
    <ErrorBoundary
      label="Dashboard"
      fallback={(_err, _retry) => (
        // We ignore the internal retry and use Next.js's reset() directly
        // so the segment is fully re-mounted from the server
        <div className="error-boundary-wrapper" role="alert" aria-live="assertive">
          <div className="error-boundary-card" style={{ maxWidth: 520 }}>
            <div className="error-boundary-icon-ring">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="error-boundary-icon"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="error-boundary-title">Dashboard Error</h2>
            <p className="error-boundary-message">{error.message}</p>

            {error.digest && (
              <p className="error-boundary-event-id">
                Reference ID:{" "}
                <code className="error-boundary-code">{error.digest}</code>
              </p>
            )}

            <div className="error-boundary-actions">
              <button
                id="dashboard-error-retry-btn"
                onClick={reset}
                className="error-boundary-btn error-boundary-btn--primary"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="error-boundary-btn-icon"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {/* ErrorBoundary children: an empty fragment so the fallback prop drives UI */}
      <></>
    </ErrorBoundary>
  );
}
