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
import type * as conversations from "../conversations.js";
import type * as cron from "../cron.js";
import type * as cronFunctions from "../cronFunctions.js";
import type * as escalation from "../escalation.js";
import type * as functionCalling from "../functionCalling.js";
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
  conversations: typeof conversations;
  cron: typeof cron;
  cronFunctions: typeof cronFunctions;
  escalation: typeof escalation;
  functionCalling: typeof functionCalling;
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
