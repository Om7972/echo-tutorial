// @ts-nocheck
/**
 * Custom tag helpers for consistent labeling across all Sentry events.
 *
 * Usage:
 *   setSentryTags({ workspace: "acme", conversationId: "conv_123" });
 *   clearSentryTag("widgetSession");
 */

import * as Sentry from "@sentry/nextjs";
import { SENTRY_TAGS } from "./config";

export interface SentryCustomTags {
  workspace?: string;
  conversationId?: string;
  widgetSession?: string;
  app?: "web" | "widget";
  runtime?: "client" | "server" | "edge";
}

/**
 * Sets one or more custom tags on the current Sentry scope.
 * Tags are indexed and searchable in the Sentry UI.
 */
export function setSentryTags(tags: SentryCustomTags): void {
  if (tags.workspace !== undefined) {
    Sentry.setTag(SENTRY_TAGS.WORKSPACE, tags.workspace);
  }
  if (tags.conversationId !== undefined) {
    Sentry.setTag(SENTRY_TAGS.CONVERSATION_ID, tags.conversationId);
  }
  if (tags.widgetSession !== undefined) {
    Sentry.setTag(SENTRY_TAGS.WIDGET_SESSION, tags.widgetSession);
  }
  if (tags.app !== undefined) {
    Sentry.setTag(SENTRY_TAGS.APP, tags.app);
  }
  if (tags.runtime !== undefined) {
    Sentry.setTag(SENTRY_TAGS.RUNTIME, tags.runtime);
  }
}

/**
 * Clears a specific tag from the current scope by setting it to undefined.
 */
export function clearSentryTag(
  key: keyof typeof SENTRY_TAGS
): void {
  Sentry.setTag(SENTRY_TAGS[key], undefined as unknown as string);
}
