# Memory System Quick Start Guide

Get your AI memory system up and running in 5 minutes.

## Step 1: Set Up Environment Variables

Add these to your `.env.local` file:

```bash
# Required for embeddings and summarization
OPENAI_API_KEY=sk-your-key-here

# Optional: Alternative for summarization
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Convex (should already be configured)
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Step 2: Deploy the Schema

The schema is already updated. Just run:

```bash
cd packages/backend
pnpm run dev
```

This deploys all memory tables to Convex.

## Step 3: Basic Usage in Your App

### Create a Memory

```typescript
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function MyComponent() {
  const createMemory = useMutation(api.memory.manager.createShortTermMemory);

  const handleNewMessage = async (message) => {
    await createMemory({
      conversationId: "conversation_id",
      orgId: "your_org_id",
      messageIds: [message.id],
      content: message.content,
      tokenCount: Math.ceil(message.content.length / 4),
      metadata: {
        sentiment: "positive",
        topics: ["support"],
      },
    });
  };
}
```

### Retrieve Memories

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function MyComponent() {
  const memories = useQuery(api.memory.retriever.retrieveHybrid, {
    conversationId: "conversation_id",
    orgId: "your_org_id",
    query: "What did the customer say about pricing?",
    limit: 5,
  });

  return (
    <div>
      {memories?.map(memory => (
        <div key={memory._id}>{memory.content}</div>
      ))}
    </div>
  );
}
```

### Generate a Summary

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function MyComponent() {
  const summarize = useAction(api.memory.summarizer.summarizeConversation);

  const handleSummarize = async () => {
    const result = await summarize({
      conversationId: "conversation_id",
      orgId: "your_org_id",
      summaryType: "final",
      provider: "openai",
    });

    console.log("Summary:", result.summary);
  };
}
```

## Step 4: View Analytics

```typescript
import { useMemoryAnalytics } from "@/lib/memory/MemoryService";

function AnalyticsDashboard() {
  const analytics = useMemoryAnalytics("your_org_id");
  const stats = analytics.getAnalytics();

  return (
    <div>
      <h2>Total Memories: {stats?.totals.totalMemories}</h2>
      <h2>Total Cost: ${stats?.totals.totalCostUSD}</h2>
      <h2>Health Score: {analytics.healthScore?.score}</h2>
    </div>
  );
}
```

## Step 5: Enable Background Jobs

The cron jobs are automatically configured. They will:

- Process memory jobs every 5 minutes
- Expire old memories daily
- Consolidate memories daily
- Generate embeddings hourly
- Update analytics daily

No additional setup required!

## Common Use Cases

### 1. Automatically Create Memories on New Messages

```typescript
// In your message handler
useEffect(() => {
  if (newMessage) {
    createMemory({
      conversationId,
      orgId,
      messageIds: [newMessage.id],
      content: newMessage.content,
      tokenCount: estimateTokens(newMessage.content),
    });
  }
}, [newMessage]);
```

### 2. Load Context Before AI Response

```typescript
const handleSendMessage = async (message: string) => {
  // Get relevant context
  const context = await retriever.hybrid(message, { limit: 5 });
  
  // Send to AI with context
  const aiResponse = await callAI({
    message,
    context: context.map(m => m.content).join("\n"),
  });
};
```

### 3. Auto-Summarize Long Conversations

```typescript
useEffect(() => {
  const checkSummarize = async () => {
    const memories = await getConversationMemories(conversationId);
    
    if (memories.length >= 50) {
      await summarize({
        conversationId,
        orgId,
        summaryType: "periodic",
      });
    }
  };
  
  checkSummarize();
}, [conversationId]);
```

### 4. Search Customer History

```typescript
const searchCustomer = async (query: string) => {
  const results = await search.semanticSearch(query, {
    limit: 10,
    minScore: 0.75,
  });
  
  return results;
};
```

## Testing Your Setup

Run this test to verify everything works:

```typescript
// Test memory creation
const testMemory = await createMemory({
  conversationId: "test_conversation",
  orgId: "test_org",
  messageIds: [],
  content: "This is a test memory",
  tokenCount: 5,
});

console.log("Memory created:", testMemory.memoryId);

// Test retrieval
const retrieved = await retrieveByRecency({
  conversationId: "test_conversation",
  orgId: "test_org",
  limit: 10,
});

console.log("Retrieved memories:", retrieved.length);
```

## Next Steps

1. **Customize summarization prompts** in `summarizer.ts`
2. **Adjust memory expiration** policies in `cronActions.ts`
3. **Configure cost limits** in your analytics dashboard
4. **Set up alerts** for memory health issues
5. **Integrate with your AI agent** for context-aware responses

## Troubleshooting

**Problem:** "API key not found"
- **Solution:** Make sure you've added `OPENAI_API_KEY` to `.env.local`

**Problem:** "No memories returned"
- **Solution:** Create some test memories first, then query

**Problem:** "Embeddings not working"
- **Solution:** Run the embedding generation job manually or wait for hourly cron

**Problem:** "High costs"
- **Solution:** Check analytics dashboard and adjust expiration policies

## Support

Check the full [README.md](./README.md) for detailed documentation.

For questions, contact the development team.
