/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiFunctions from "../aiFunctions.js";
import type * as analytics from "../analytics.js";
import type * as automation_engine from "../automation/engine.js";
import type * as automation_logs from "../automation/logs.js";
import type * as automation_workflows from "../automation/workflows.js";
import type * as collaboration_activity from "../collaboration/activity.js";
import type * as collaboration_assignments from "../collaboration/assignments.js";
import type * as collaboration_audit from "../collaboration/audit.js";
import type * as collaboration_notes from "../collaboration/notes.js";
import type * as collaboration_notifications from "../collaboration/notifications.js";
import type * as collaboration_permissions from "../collaboration/permissions.js";
import type * as collaboration_tags from "../collaboration/tags.js";
import type * as conversations from "../conversations.js";
import type * as cron from "../cron.js";
import type * as cronFunctions from "../cronFunctions.js";
import type * as csat_analytics from "../csat/analytics.js";
import type * as csat_ratings from "../csat/ratings.js";
import type * as csat_surveys from "../csat/surveys.js";
import type * as email_accounts from "../email/accounts.js";
import type * as email_messages from "../email/messages.js";
import type * as email_templates from "../email/templates.js";
import type * as email_threads from "../email/threads.js";
import type * as escalation from "../escalation.js";
import type * as functionCalling from "../functionCalling.js";
import type * as inbox_conversations from "../inbox/conversations.js";
import type * as inbox_customers from "../inbox/customers.js";
import type * as inbox_search from "../inbox/search.js";
import type * as kb from "../kb.js";
import type * as memory_analytics from "../memory/analytics.js";
import type * as memory_config from "../memory/config.js";
import type * as memory_cron from "../memory/cron.js";
import type * as memory_cronActions from "../memory/cronActions.js";
import type * as memory_embeddings from "../memory/embeddings.js";
import type * as memory_index from "../memory/index.js";
import type * as memory_jobs from "../memory/jobs.js";
import type * as memory_manager from "../memory/manager.js";
import type * as memory_retriever from "../memory/retriever.js";
import type * as memory_summarizer from "../memory/summarizer.js";
import type * as sentiment_analytics from "../sentiment/analytics.js";
import type * as sentiment_analyzer from "../sentiment/analyzer.js";
import type * as sentiment_rules from "../sentiment/rules.js";
import type * as subscriptions from "../subscriptions.js";
import type * as summarization_generator from "../summarization/generator.js";
import type * as timeline_calls from "../timeline/calls.js";
import type * as timeline_emails from "../timeline/emails.js";
import type * as timeline_events from "../timeline/events.js";
import type * as timeline_notes from "../timeline/notes.js";
import type * as users from "../users.js";
import type * as voice_messages from "../voice_messages.js";
import type * as voice_sessions from "../voice_sessions.js";
import type * as widget from "../widget.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiFunctions: typeof aiFunctions;
  analytics: typeof analytics;
  "automation/engine": typeof automation_engine;
  "automation/logs": typeof automation_logs;
  "automation/workflows": typeof automation_workflows;
  "collaboration/activity": typeof collaboration_activity;
  "collaboration/assignments": typeof collaboration_assignments;
  "collaboration/audit": typeof collaboration_audit;
  "collaboration/notes": typeof collaboration_notes;
  "collaboration/notifications": typeof collaboration_notifications;
  "collaboration/permissions": typeof collaboration_permissions;
  "collaboration/tags": typeof collaboration_tags;
  conversations: typeof conversations;
  cron: typeof cron;
  cronFunctions: typeof cronFunctions;
  "csat/analytics": typeof csat_analytics;
  "csat/ratings": typeof csat_ratings;
  "csat/surveys": typeof csat_surveys;
  "email/accounts": typeof email_accounts;
  "email/messages": typeof email_messages;
  "email/templates": typeof email_templates;
  "email/threads": typeof email_threads;
  escalation: typeof escalation;
  functionCalling: typeof functionCalling;
  "inbox/conversations": typeof inbox_conversations;
  "inbox/customers": typeof inbox_customers;
  "inbox/search": typeof inbox_search;
  kb: typeof kb;
  "memory/analytics": typeof memory_analytics;
  "memory/config": typeof memory_config;
  "memory/cron": typeof memory_cron;
  "memory/cronActions": typeof memory_cronActions;
  "memory/embeddings": typeof memory_embeddings;
  "memory/index": typeof memory_index;
  "memory/jobs": typeof memory_jobs;
  "memory/manager": typeof memory_manager;
  "memory/retriever": typeof memory_retriever;
  "memory/summarizer": typeof memory_summarizer;
  "sentiment/analytics": typeof sentiment_analytics;
  "sentiment/analyzer": typeof sentiment_analyzer;
  "sentiment/rules": typeof sentiment_rules;
  subscriptions: typeof subscriptions;
  "summarization/generator": typeof summarization_generator;
  "timeline/calls": typeof timeline_calls;
  "timeline/emails": typeof timeline_emails;
  "timeline/events": typeof timeline_events;
  "timeline/notes": typeof timeline_notes;
  users: typeof users;
  voice_messages: typeof voice_messages;
  voice_sessions: typeof voice_sessions;
  widget: typeof widget;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
