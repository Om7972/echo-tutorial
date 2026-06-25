// @ts-nocheck
"use client";

/**
 * SentryUserSync
 *
 * Invisible component that keeps Sentry's user context in sync with Clerk.
 * Mount once inside your authenticated layout (below ClerkProvider).
 *
 * It sets:
 *   - userId
 *   - email (primary email address)
 *   - organizationId (active org)
 *
 * Usage:
 *   // In app/(dashboard)/layout.tsx or similar:
 *   import { SentryUserSync } from "@/components/error-boundary/sentry-user-sync";
 *   <SentryUserSync />
 */

import { useEffect } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { setSentryUser, clearSentryUser } from "@/lib/sentry/user-context";

export function SentryUserSync() {
  const { user, isSignedIn } = useUser();
  const { organization } = useOrganization();

  useEffect(() => {
    if (isSignedIn && user) {
      setSentryUser({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        organizationId: organization?.id,
      });
    } else {
      clearSentryUser();
    }
  }, [isSignedIn, user, organization]);

  // Renders nothing
  return null;
}
