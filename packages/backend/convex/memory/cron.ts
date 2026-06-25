// @ts-nocheck
/**
 * Cron jobs for automated memory management
 * Runs periodic tasks like summarization, expiration, and cleanup
 */

import { cronJobs } from "convex/server";
import { internal } from "../_generated/api";

const crons = cronJobs();

/**
 * Process pending memory jobs every 5 minutes
 */
crons.interval(
  "process-memory-jobs",
  { minutes: 5 },
  internal.memory.jobs.processJobs,
  { batchSize: 20 }
);

/**
 * Expire old memories daily at 2 AM
 */
crons.daily(
  "expire-old-memories",
  { hourUTC: 2, minuteUTC: 0 },
  internal.memory.cron.expireOldMemoriesAllOrgs
);

/**
 * Consolidate old short-term memories to long-term daily at 3 AM
 */
crons.daily(
  "consolidate-memories",
  { hourUTC: 3, minuteUTC: 0 },
  internal.memory.cron.consolidateMemoriesAllOrgs
);

/**
 * Update relevance scores (decay) daily at 4 AM
 */
crons.daily(
  "decay-relevance-scores",
  { hourUTC: 4, minuteUTC: 0 },
  internal.memory.cron.decayRelevanceScoresAllOrgs
);

/**
 * Generate embeddings for memories without them every hour
 */
crons.hourly(
  "generate-missing-embeddings",
  { minuteUTC: 15 },
  internal.memory.cron.generateMissingEmbeddings
);

/**
 * Update daily analytics at midnight
 */
crons.daily(
  "update-memory-analytics",
  { hourUTC: 0, minuteUTC: 5 },
  internal.memory.cron.updateDailyAnalytics
);

/**
 * Clean up old completed jobs weekly
 */
crons.weekly(
  "cleanup-old-jobs",
  { dayOfWeek: "monday", hourUTC: 1, minuteUTC: 0 },
  internal.memory.cron.cleanupOldJobs
);

export default crons;
