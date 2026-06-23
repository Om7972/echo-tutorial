/**
 * Memory System Public API
 * Central export file for all memory-related functions
 */

// Manager functions
export {
  createShortTermMemory,
  convertToLongTerm,
  getConversationMemories,
  getMemoryStats,
  deleteMemory,
  consolidateMemories,
} from "./manager";

// Retriever functions
export {
  retrieveByRecency,
  retrieveBySemantic,
  retrieveHybrid,
  retrieveContextRanked,
  getRetrievalAnalytics,
  searchMemories,
} from "./retriever";

// Summarizer functions
export {
  summarizeConversation,
  analyzeSentiment,
  getConversationSummaries,
  storeSummary,
} from "./summarizer";

// Embeddings functions
export {
  generateMemoryEmbedding,
  batchGenerateEmbeddings,
  generateChunkEmbedding,
  searchBySimilarity,
  trackEmbeddingUsage,
  deleteMemoryEmbeddings,
} from "./embeddings";

// Analytics functions
export {
  getMemoryAnalytics,
  getCostBreakdown,
  getUsageTrends,
  getRetrievalMetrics,
  getTopMemories,
  getJobStatistics,
  getMemoryHealthScore,
} from "./analytics";

// Job management
export {
  processJobs,
} from "./jobs";

// Cron actions
export {
  expireOldMemoriesAllOrgs,
  consolidateMemoriesAllOrgs,
  decayRelevanceScoresAllOrgs,
  generateMissingEmbeddings,
  updateDailyAnalytics,
  cleanupOldJobs,
} from "./cronActions";
