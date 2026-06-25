// @ts-nocheck
"use client";

/**
 * global-error.tsx — Next.js App Router global error boundary.
 *
 * This file is REQUIRED by Next.js to catch errors in the root layout.
 * It replaces the entire HTML document on failure, so it must include
 * <html> and <body> tags.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Capture the root-level error in Sentry with a special tag
    Sentry.withScope((scope) => {
      scope.setTag("boundary.level", "root");
      scope.setTag("boundary.label", "GlobalError");
      if (error.digest) {
        scope.setTag("error.digest", error.digest);
      }
      scope.setLevel("fatal");
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #12050a 100%)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            maxWidth: "480px",
            width: "100%",
            margin: "0 auto",
            padding: "2.5rem 2rem",
            borderRadius: "1.25rem",
            background:
              "linear-gradient(145deg, rgba(30,10,10,0.9) 0%, rgba(45,15,15,0.8) 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
            backdropFilter: "blur(16px)",
            boxShadow:
              "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 70%)",
              border: "1.5px solid rgba(239,68,68,0.4)",
            }}
          >
            <AlertTriangle
              style={{ width: "1.5rem", height: "1.5rem", color: "rgb(239,68,68)" }}
            />
          </div>

          {/* Text */}
          <h1
            style={{
              margin: 0,
              fontSize: "1.375rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "rgb(254,226,226)",
              textAlign: "center",
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "rgb(148,163,184)",
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: "36ch",
            }}
          >
            A critical error has occurred. Our team has been notified
            automatically. Please try refreshing the page.
          </p>

          {/* Digest */}
          {error.digest && (
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "rgb(71,85,105)",
                textAlign: "center",
              }}
            >
              Error ID:{" "}
              <code
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.7rem",
                  background: "rgba(255,255,255,0.06)",
                  padding: "0.1em 0.35em",
                  borderRadius: "4px",
                  color: "rgb(100,116,139)",
                }}
              >
                {error.digest}
              </code>
            </p>
          )}

          {/* Retry button */}
          <button
            id="global-error-retry-btn"
            onClick={reset}
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginTop: "0.5rem",
              padding: "0.6rem 1.5rem",
              borderRadius: "0.625rem",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              background:
                "linear-gradient(135deg, rgb(239,68,68) 0%, rgb(220,38,38) 100%)",
              color: "#fff",
              boxShadow: "0 2px 12px rgba(239,68,68,0.4)",
            }}
          >
            <RefreshCw style={{ width: "0.9rem", height: "0.9rem" }} />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
