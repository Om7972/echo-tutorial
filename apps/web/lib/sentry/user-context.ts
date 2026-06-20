/**
 * Helpers to attach Clerk user context to every Sentry event.
 * Call `setSentryUser` immediately after the user authenticates and
 * `clearSentryUser` on sign-out.
 */

import * as Sentry from "@sentry/nextjs";

export interface SentryUserContext {
  userId: string;
  email?: string;
  organizationId?: string;
}

/**
 * Attaches user identity to the current Sentry scope.
 * All subsequent events will include this context.
 */
export function setSentryUser(context: SentryUserContext): void {
  Sentry.setUser({
    id: context.userId,
    email: context.email,
    // Store organizationId as an extra field
    // (Sentry's User interface does not have a native org field)
  });

  if (context.organizationId) {
    Sentry.setTag("organizationId", context.organizationId);
  }
}

/**
 * Clears user context from the current Sentry scope.
 * Call on sign-out to avoid cross-session contamination.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setTag("organizationId", undefined as unknown as string);
}
