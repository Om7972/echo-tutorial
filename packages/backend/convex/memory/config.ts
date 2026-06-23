/**
 * Memory System Configuration
 * Centralized configuration for the memory system
 */

export const MemoryConfig = {
  /**
   * Short-term memory settings
   */
  shortTerm: {
    // Convert to long-term after this many days
    maxAgeDays: 7,
    
    // Trigger consolidation after this many memories
    consolidationThreshold: 50,
    
    // Maximum short-term memories per conversation
    maxCount: 100,
  },

  /**
   * Long-term memory settings
   */
  longTerm: {
    // Expire after this many days of inactivity
    expirationDays: 90,
    
    // Minimum relevance score to keep (0-1)
    minRelevanceScore: 0.1,
  },

  /**
   * Embedding settings
   */
  embeddings: {
    // Default model for embeddings
    defaultModel: "text-embedding-3-small" as const,
    
    // Use large model for important memories
    useLargeModelForImportant: false,
    
    // Minimum content length to generate embedding
    minContentLength: 50,
    
    // Batch size for bulk generation
    batchSize: 50,
  },

  /**
   * Summarization settings
   */
  summarization: {
    // Default AI provider
    defaultProvider: "openai" as const,
    
    // Fallback provider if default fails
    fallbackProvider: "anthropic" as const,
    
    // Trigger summary after this many messages
    messageThreshold: 50,
    
    // Models by provider
    models: {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-20241022",
    },
  },

  /**
   * Retrieval settings
   */
  retrieval: {
    // Default retrieval strategy
    defaultStrategy: "hybrid" as const,
    
    // Default number of memories to retrieve
    defaultLimit: 10,
    
    // Maximum memories per retrieval
    maxLimit: 50,
    
    // Minimum similarity score for semantic search
    minSimilarityScore: 0.7,
    
    // Weight for recency in hybrid search (0-1)
    recencyWeight: 0.6,
    
    // Weight for semantic similarity in hybrid search (0-1)
    semanticWeight: 0.4,
  },

  /**
   * Job processing settings
   */
  jobs: {
    // Batch size for job processing
    batchSize: 20,
    
    // Maximum retries for failed jobs
    maxRetries: 3,
    
    // Job timeout in seconds
    timeoutSeconds: 300,
    
    // Priority levels
    priorities: {
      low: "low" as const,
      medium: "medium" as const,
      high: "high" as const,
    },
  },

  /**
   * Cost optimization settings
   */
  costs: {
    // Alert when daily cost exceeds this amount (USD)
    dailyCostThreshold: 10.0,
    
    // Alert when monthly cost exceeds this amount (USD)
    monthlyCostThreshold: 100.0,
    
    // Use cheaper models when possible
    optimizeForCost: true,
    
    // Track cost per conversation
    trackPerConversation: true,
  },

  /**
   * Analytics settings
   */
  analytics: {
    // Retain analytics data for this many days
    retentionDays: 90,
    
    // Update analytics this frequently (minutes)
    updateIntervalMinutes: 60,
    
    // Track detailed retrieval logs
    detailedLogging: true,
  },

  /**
   * Cron schedule settings
   */
  cron: {
    // Process jobs every N minutes
    jobProcessingInterval: 5,
    
    // Memory expiration hour (UTC)
    expirationHour: 2,
    
    // Consolidation hour (UTC)
    consolidationHour: 3,
    
    // Relevance decay hour (UTC)
    decayHour: 4,
    
    // Cleanup day of week
    cleanupDay: "monday" as const,
  },

  /**
   * Performance settings
   */
  performance: {
    // Cache retrieval results for this many seconds
    cacheTimeSeconds: 60,
    
    // Maximum memory content length
    maxContentLength: 10000,
    
    // Chunk size for large memories
    chunkSize: 1000,
  },

  /**
   * Feature flags
   */
  features: {
    // Enable automatic summarization
    autoSummarization: true,
    
    // Enable automatic embedding generation
    autoEmbeddings: true,
    
    // Enable memory expiration
    memoryExpiration: true,
    
    // Enable memory consolidation
    memoryConsolidation: true,
    
    // Enable sentiment analysis
    sentimentAnalysis: true,
    
    // Enable cost tracking
    costTracking: true,
  },
} as const;

/**
 * Get configuration for a specific environment
 */
export function getMemoryConfig(env: "development" | "production" | "test") {
  const baseConfig = MemoryConfig;

  // Environment-specific overrides
  const overrides = {
    development: {
      costs: {
        ...baseConfig.costs,
        optimizeForCost: true,
        dailyCostThreshold: 5.0,
      },
      analytics: {
        ...baseConfig.analytics,
        detailedLogging: true,
      },
    },
    production: {
      costs: {
        ...baseConfig.costs,
        optimizeForCost: false,
        dailyCostThreshold: 50.0,
        monthlyCostThreshold: 1000.0,
      },
      performance: {
        ...baseConfig.performance,
        cacheTimeSeconds: 300,
      },
    },
    test: {
      costs: {
        ...baseConfig.costs,
        optimizeForCost: true,
        dailyCostThreshold: 1.0,
      },
      features: {
        ...baseConfig.features,
        autoSummarization: false,
        autoEmbeddings: false,
      },
    },
  };

  return {
    ...baseConfig,
    ...overrides[env],
  };
}

/**
 * Validate memory configuration
 */
export function validateMemoryConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check API keys
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    errors.push("At least one AI provider API key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }

  // Check Convex URL
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    errors.push("NEXT_PUBLIC_CONVEX_URL is required");
  }

  // Validate weights
  const totalWeight = MemoryConfig.retrieval.recencyWeight + MemoryConfig.retrieval.semanticWeight;
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push("Retrieval weights (recency + semantic) must sum to 1.0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export common type definitions
 */
export type MemoryType = "short_term" | "long_term" | "semantic";
export type RetrievalStrategy = "recency" | "semantic" | "hybrid" | "context_ranked";
export type SummaryType = "rolling" | "periodic" | "thematic" | "final";
export type AIProvider = "openai" | "anthropic";
export type JobType = "summarize" | "generate_embeddings" | "expire_memories" | "consolidate" | "analyze_sentiment";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type JobPriority = "low" | "medium" | "high";

/**
 * Utility function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof MemoryConfig.features): boolean {
  return MemoryConfig.features[feature];
}

/**
 * Utility function to get cost threshold
 */
export function getCostThreshold(period: "daily" | "monthly"): number {
  return period === "daily" 
    ? MemoryConfig.costs.dailyCostThreshold 
    : MemoryConfig.costs.monthlyCostThreshold;
}

/**
 * Utility function to calculate token limit
 */
export function getTokenLimit(contentLength: number): number {
  const estimatedTokens = Math.ceil(contentLength / 4);
  const maxTokens = Math.ceil(MemoryConfig.performance.maxContentLength / 4);
  return Math.min(estimatedTokens, maxTokens);
}
