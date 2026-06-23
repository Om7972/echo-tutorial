# Long-Term AI Memory System

A comprehensive memory architecture for Next.js 15 applications with Convex, OpenAI/Anthropic integration, featuring automatic summarization, semantic search, and intelligent memory management.

## 🚀 Features

### Core Memory Management
- **Short-term Memory**: Recent conversation messages (last N messages)
- **Long-term Memory**: Summarized older conversations with key insights
- **Semantic Memory**: Vector embeddings for similarity-based retrieval

### Intelligent Summarization
- Automatic conversation summarization using GPT-4o or Claude 3.5 Sonnet
- Extracts:
  - Key points and topics
  - Action items and decisions
  - Customer profile (name, email, preferences, pain points)
  - Purchase history
  - Issues encountered with severity tracking
  - Sentiment analysis (score and trend)

### Advanced Retrieval Strategies
1. **Recency-based**: Most recent memories first
2. **Semantic**: Vector similarity search using embeddings
3. **Hybrid**: Combines recency and semantic similarity
4. **Context-ranked**: Ranks by keyword and topic relevance

### Background Job Processing
- Automated summarization of old conversations
- Batch embedding generation
- Memory expiration and cleanup
- Consolidation of short-term to long-term memories
- Sentiment analysis

### Cost Optimization
- Tracks token usage and costs per operation
- Daily cost analytics and breakdown
- Configurable embedding models (small vs large)
- Batch processing to reduce API calls

### Memory Expiration
- Configurable TTL for memories
- Automatic cleanup of expired data
- Relevance score decay over time

### Analytics & Monitoring
- Daily usage metrics
- Cost breakdown (summarization vs embeddings)
- Retrieval performance tracking
- Memory health score and recommendations
- Job statistics and success rates

## 📁 Architecture

```
memory/
├── manager.ts          # Core memory CRUD operations
├── retriever.ts        # Advanced retrieval strategies
├── summarizer.ts       # AI-powered summarization
├── embeddings.ts       # Vector embeddings generation
├── jobs.ts            # Background job processing
├── cron.ts            # Scheduled tasks configuration
├── cronActions.ts     # Cron job implementations
├── analytics.ts       # Analytics and reporting
└── README.md          # This file
```

## 🗄️ Database Schema

### Tables Created
- `conversation_memories` - Main memory storage
- `memory_chunks` - Chunked memory content
- `memory_embeddings` - Vector embeddings
- `memory_summaries` - AI-generated summaries
- `memory_retrieval_logs` - Retrieval tracking
- `memory_jobs` - Background job queue
- `memory_analytics` - Daily statistics

## 🔧 Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
# OpenAI (for embeddings and summarization)
OPENAI_API_KEY=sk-...

# Anthropic (alternative for summarization)
ANTHROPIC_API_KEY=sk-ant-...

# Convex
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 2. Install Dependencies

```bash
cd packages/backend
pnpm install
```

The following are already installed:
- `convex` - ^1.25.4
- `openai` - ^4.0.0
- `@anthropic-ai/sdk` - ^0.20.0

### 3. Deploy Schema

```bash
cd packages/backend
pnpm run dev  # or: convex dev
```

This will automatically deploy the updated schema with memory tables.

## 📖 Usage Examples

### Create Short-Term Memory

```typescript
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const createMemory = useMutation(api.memory.manager.createShortTermMemory);

await createMemory({
  conversationId: conversationId,
  orgId: "org_123",
  userId: "user_456",
  messageIds: [messageId1, messageId2],
  content: "Customer asked about pricing for enterprise plan...",
  tokenCount: 150,
  metadata: {
    sentiment: "positive",
    topics: ["pricing", "enterprise"],
    entities: ["Enterprise Plan"],
  },
});
```

### Retrieve Memories (Hybrid Strategy)

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const memories = useQuery(api.memory.retriever.retrieveHybrid, {
  conversationId: conversationId,
  orgId: "org_123",
  query: "What did the customer say about pricing?",
  limit: 10,
  recencyWeight: 0.6,
  semanticWeight: 0.4,
});
```

### Generate Summary

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const summarize = useAction(api.memory.summarizer.summarizeConversation);

const result = await summarize({
  conversationId: conversationId,
  orgId: "org_123",
  summaryType: "final",
  provider: "openai", // or "anthropic"
});

console.log(result.summary);
```

### Search Semantically

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const search = useAction(api.memory.embeddings.searchBySimilarity);

const results = await search({
  orgId: "org_123",
  query: "customer complaints about slow response",
  limit: 5,
  minScore: 0.75,
});
```

### Get Analytics

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const analytics = useQuery(api.memory.analytics.getMemoryAnalytics, {
  orgId: "org_123",
  startDate: "2026-05-01",
  endDate: "2026-06-01",
});

console.log("Total memories:", analytics?.totals.totalMemories);
console.log("Total cost:", analytics?.totals.totalCostUSD);
```

## 🤖 Automated Jobs

The system runs several background jobs automatically:

- **Every 5 minutes**: Process pending memory jobs
- **Daily at 2 AM**: Expire old memories (90+ days)
- **Daily at 3 AM**: Consolidate short-term to long-term memories
- **Daily at 4 AM**: Decay relevance scores (5% daily)
- **Hourly at :15**: Generate missing embeddings
- **Daily at 12:05 AM**: Update daily analytics
- **Weekly (Mondays at 1 AM)**: Clean up old completed jobs

## 💰 Cost Tracking

### OpenAI Costs
- **GPT-4o**: $0.0025/1K input tokens, $0.01/1K output tokens
- **GPT-4o-mini**: $0.00015/1K input, $0.0006/1K output
- **Embeddings (small)**: $0.00002/1K tokens
- **Embeddings (large)**: $0.00013/1K tokens

### Anthropic Costs
- **Claude 3.5 Sonnet**: $0.003/1K input, $0.015/1K output
- **Claude 3 Haiku**: $0.00025/1K input, $0.00125/1K output

All costs are automatically tracked and reported in analytics.

## 🎯 Best Practices

### 1. Memory Types
- Use **short-term** for recent messages (< 7 days)
- Convert to **long-term** after 7 days
- Use **semantic** type for embedding-enabled memories

### 2. Summarization
- Summarize conversations when they reach 50+ messages
- Use "periodic" summaries for ongoing conversations
- Use "final" summaries when conversations close

### 3. Embeddings
- Generate embeddings for important memories
- Use "text-embedding-3-small" for cost efficiency
- Use "text-embedding-3-large" for better quality

### 4. Retrieval
- Start with **hybrid** strategy for balanced results
- Use **semantic** when you need conceptual matches
- Use **recency** for time-sensitive queries
- Use **context-ranked** when you have specific keywords

### 5. Cost Optimization
- Batch embedding generation during off-peak hours
- Set appropriate memory expiration policies
- Monitor analytics dashboard for cost trends
- Use smaller models when appropriate

## 🔍 Multi-Workspace Support

The system is fully multi-tenant and supports multiple workspaces:

```typescript
// Each operation requires orgId
await createMemory({
  orgId: currentOrg.id,  // Isolates data by organization
  // ... other fields
});
```

All queries are filtered by `orgId` to ensure data isolation.

## 📊 Monitoring & Health

### Memory Health Score

The system provides a health score (0-100) based on:
- Embedding coverage (target: >30%)
- Stale memory ratio (target: <50% older than 60 days)
- Short-term to long-term ratio (target: <10:1)
- Recent job failure rate

```typescript
const health = useQuery(api.memory.analytics.getMemoryHealthScore, {
  orgId: "org_123",
});

console.log("Health score:", health?.score);
console.log("Grade:", health?.grade);
console.log("Issues:", health?.issues);
console.log("Recommendations:", health?.recommendations);
```

## 🚦 Streaming Updates

All memory operations support real-time updates through Convex's reactive queries:

```typescript
// Automatically updates when new memories are created
const memories = useQuery(api.memory.manager.getConversationMemories, {
  conversationId: conversationId,
  type: "short_term",
  limit: 20,
});
```

## 🛠️ Troubleshooting

### High Costs
1. Check analytics dashboard for cost breakdown
2. Review summarization frequency
3. Consider using smaller embedding models
4. Adjust memory expiration policies

### Slow Retrieval
1. Ensure embeddings are generated
2. Check retrieval logs for performance metrics
3. Consider reducing result limits
4. Use more specific queries

### Failed Jobs
1. Check job statistics dashboard
2. Verify API keys are valid
3. Check rate limits
4. Review error messages in job logs

## 📝 License

Part of the Echo project - internal use only.

## 🤝 Support

For issues or questions, contact the development team or check the main project documentation.
