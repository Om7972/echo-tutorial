"use client";

import "./error-boundary.css";

/**
 * Production-grade ErrorBoundary component.
 *
 * Features:
 * - Catches render-time errors in any child component tree
 * - Reports the error to Sentry with full context
 * - Shows an elegant fallback UI with a retry button
 * - Resets local state on retry so the tree re-mounts cleanly
 * - Accepts an optional custom fallback renderer via `fallback` prop
 *
 * Usage:
 *   <ErrorBoundary label="DashboardWidget">
 *     <MyWidget />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={(error, retry) => <MyCustomUI onRetry={retry} />}>
 *     <MyPage />
 *   </ErrorBoundary>
 */

import React, { Component, ErrorInfo } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Human-readable label shown in the fallback UI and Sentry tags */
  label?: string;
  /** Optional custom fallback render function */
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
  showDetails: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
      showDetails: false,
    };
    this.handleRetry = this.handleRetry.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const eventId = Sentry.withScope((scope) => {
      scope.setTag("boundary.label", this.props.label ?? "unknown");
      scope.setContext("React ErrorBoundary", {
        componentStack: info.componentStack ?? "",
        label: this.props.label,
      });
      scope.setLevel("error");
      return Sentry.captureException(error);
    });

    this.setState({ eventId: eventId ?? null });
  }

  handleRetry(): void {
    // Reset error state so the child tree re-mounts from scratch
    this.setState({
      hasError: false,
      error: null,
      eventId: null,
      showDetails: false,
    });
  }

  toggleDetails(): void {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  }

  render() {
    const { hasError, error, eventId, showDetails } = this.state;
    const { children, fallback, label } = this.props;

    if (!hasError || !error) return children;

    // Delegate to custom fallback if provided
    if (fallback) return fallback(error, this.handleRetry);

    return (
      <ErrorFallbackUI
        error={error}
        eventId={eventId}
        label={label}
        showDetails={showDetails}
        onRetry={this.handleRetry}
        onToggleDetails={this.toggleDetails}
      />
    );
  }
}

// ─── Fallback UI ─────────────────────────────────────────────────────────────

interface FallbackProps {
  error: Error;
  eventId: string | null;
  label?: string;
  showDetails: boolean;
  onRetry: () => void;
  onToggleDetails: () => void;
}

function ErrorFallbackUI({
  error,
  eventId,
  label,
  showDetails,
  onRetry,
  onToggleDetails,
}: FallbackProps) {
  return (
    <div className="error-boundary-wrapper" role="alert" aria-live="assertive">
      <div className="error-boundary-card">
        {/* Icon */}
        <div className="error-boundary-icon-ring">
          <AlertTriangle className="error-boundary-icon" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2 className="error-boundary-title">Something went wrong</h2>

        {/* Context */}
        {label && (
          <p className="error-boundary-context">
            in <span className="error-boundary-label">{label}</span>
          </p>
        )}

        {/* Message */}
        <p className="error-boundary-message">{error.message}</p>

        {/* Event ID */}
        {eventId && (
          <p className="error-boundary-event-id">
            Reference ID:{" "}
            <code className="error-boundary-code">{eventId}</code>
          </p>
        )}

        {/* Actions */}
        <div className="error-boundary-actions">
          <button
            id="error-boundary-retry-btn"
            onClick={onRetry}
            className="error-boundary-btn error-boundary-btn--primary"
            type="button"
          >
            <RefreshCw className="error-boundary-btn-icon" aria-hidden="true" />
            Try again
          </button>

          <button
            id="error-boundary-details-btn"
            onClick={onToggleDetails}
            className="error-boundary-btn error-boundary-btn--ghost"
            type="button"
            aria-expanded={showDetails ? "true" : "false"}
          >
            {showDetails ? (
              <ChevronUp className="error-boundary-btn-icon" aria-hidden="true" />
            ) : (
              <ChevronDown className="error-boundary-btn-icon" aria-hidden="true" />
            )}
            {showDetails ? "Hide" : "Show"} details
          </button>
        </div>

        {/* Expandable stack trace */}
        {showDetails && (
          <div className="error-boundary-stack" aria-label="Error stack trace">
            <pre>{error.stack ?? "No stack trace available."}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
