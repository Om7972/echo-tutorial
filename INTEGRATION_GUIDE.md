# Memory System Integration Guide

This guide shows how to integrate the memory system into your existing Echo application.

## 🎯 Integration Points

### 1. Message Creation Hook

Add memory creation when messages are sent/received:

**File:** `apps/web/app/(dashboard)/dashboard/page.tsx` or your message handler

```typescript
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function ConversationComponent() {
  const createMemory = useMutation(api.memory.manager.createShortTermMemory);
  const sendMessage = useMutation(api.messages.send); // Your existing mutation

  const handleSendMessage = async (content: string) => {
    // 1. Send message as usual
    const message = await sendMessage({
      conversationId,
      content,
      // ... other fields
    });

    // 2. Create memory from the message
    await createMemory({
      conversationId,
      orgId: currentOrg.id,
      userId: currentUser.id,
      messageIds: [message._id],
      content: content,
      tokenCount: Math.ceil(content.length / 4),
      metadata: {
        sentiment: detectSentiment(content),
        topics: extractTopics(content),
      },
    });

    return message;
  };

  return (
    <ChatInterface onSend={handleSendMessage} />
  );
}
```

### 2. AI Response Context Loading

Load relevant memory before generating AI responses:

```typescript
import { useMemoryRetriever } from "@/lib/memory/MemoryService";
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function AIResponseHandler() {
  const retriever = useMemoryRetriever(conversationId, orgId);
  const generateResponse = useAction(api.aiFunctions.generate); // Your AI function

  const handleUserMessage = async (userMessage: string) => {
    // 1. Retrieve relevant context
    const context = retriever.hybrid(userMessage, {
      limit: 5,
      recencyWeight: 0.6,
      semanticWeight: 0.4,
    });

    // 2. Format context for AI
    const contextStr = context
      ?.map((m, i) => `[Context ${i + 1}]: ${m.content}`)
      .join("\n\n");

    // 3. Generate AI response with context
    const aiResponse = await generateResponse({
      conversationId,
      userMessage,
      context: contextStr,
    });

    return aiResponse;
  };
}
```

### 3. Conversation Summary Display

Show conversation summaries in the UI:

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function ConversationSidebar({ conversationId, orgId }) {
  const summaries = useQuery(api.memory.summarizer.getConversationSummaries, {
    conversationId,
  });

  const latestSummary = summaries?.[0];

  if (!latestSummary) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">Conversation Summary</h3>
      <p className="text-sm mb-3">{latestSummary.summary}</p>

      {latestSummary.customerProfile && (
        <div className="mb-2">
          <h4 className="font-medium text-sm">Customer</h4>
          <p className="text-xs">{latestSummary.customerProfile.name}</p>
          <p className="text-xs text-gray-600">{latestSummary.customerProfile.email}</p>
        </div>
      )}

      {latestSummary.issuesEncountered && (
        <div>
          <h4 className="font-medium text-sm">Open Issues</h4>
          {latestSummary.issuesEncountered.map((issue, i) => (
            <div key={i} className="text-xs">
              <span className={`badge ${issue.severity}`}>{issue.severity}</span>
              {issue.issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Auto-Summarization Trigger

Automatically summarize long conversations:

```typescript
import { useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function ConversationContainer({ conversationId, orgId }) {
  const memories = useQuery(api.memory.manager.getConversationMemories, {
    conversationId,
    type: "short_term",
  });

  const summarize = useAction(api.memory.summarizer.summarizeConversation);

  useEffect(() => {
    const checkSummarization = async () => {
      // If 50+ short-term memories, trigger summarization
      if (memories && memories.length >= 50) {
        await summarize({
          conversationId,
          orgId,
          summaryType: "periodic",
          provider: "openai",
        });
      }
    };

    checkSummarization();
  }, [memories?.length]);

  // ... rest of component
}
```

### 5. Memory Search in Dashboard

Add memory search to your dashboard:

```typescript
import { MemorySearch } from "@/components/memory/MemorySearch";

function DashboardPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Existing conversation list */}
      <div className="col-span-2">
        <ConversationList onSelect={setSelectedConversation} />
      </div>

      {/* Memory search */}
      <div>
        {selectedConversation && (
          <MemorySearch
            conversationId={selectedConversation.id}
            orgId={currentOrg.id}
          />
        )}
      </div>
    </div>
  );
}
```

### 6. Analytics Dashboard

Add analytics to admin panel:

```typescript
import { MemoryDashboard } from "@/components/memory/MemoryDashboard";

function AdminPanel() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      {/* Add memory analytics */}
      <section className="mt-8">
        <MemoryDashboard orgId={currentOrg.id} />
      </section>
    </div>
  );
}
```

### 7. Modify AI Functions (Optional)

Update existing AI functions to use memory context:

**File:** `packages/backend/convex/aiFunctions.ts`

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateWithMemory = action({
  args: {
    conversationId: v.id("conversations"),
    orgId: v.string(),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get relevant memories
    const memories = await ctx.runQuery(internal.memory.retriever.retrieveHybrid, {
      conversationId: args.conversationId,
      orgId: args.orgId,
      query: args.userMessage,
      limit: 5,
    });

    // 2. Format context
    const context = memories
      .map((m, i) => `[Memory ${i + 1}]: ${m.content}`)
      .join("\n\n");

    // 3. Call your existing AI logic with context
    const systemPrompt = `You are a helpful assistant. Use this context from past conversations:

${context}

Now respond to the user's message.`;

    // ... rest of AI logic
  },
});
```

## 🔄 Background Jobs Setup

The cron jobs run automatically. To manually trigger:

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function AdminControls() {
  const processJobs = useAction(api.memory.jobs.processJobs);

  const handleProcessJobs = async () => {
    const result = await processJobs({ batchSize: 20 });
    console.log("Processed:", result.processedCount);
  };

  return (
    <button onClick={handleProcessJobs}>
      Process Memory Jobs
    </button>
  );
}
```

## 📊 Cost Monitoring Integration

Add cost alerts to your existing notification system:

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function CostMonitor({ orgId }) {
  const costBreakdown = useQuery(api.memory.analytics.getCostBreakdown, {
    orgId,
    startDate: getMonthStart(),
    endDate: new Date().toISOString().split("T")[0],
  });

  const monthlyThreshold = 100; // $100/month

  useEffect(() => {
    if (costBreakdown && costBreakdown.totalCost > monthlyThreshold) {
      // Trigger your existing alert system
      showAlert({
        type: "warning",
        message: `Memory costs exceeded $${monthlyThreshold} this month`,
      });
    }
  }, [costBreakdown?.totalCost]);

  return (
    <div className="cost-widget">
      <h4>Memory Costs (This Month)</h4>
      <p className="text-2xl font-bold">
        ${costBreakdown?.totalCost.toFixed(2) || "0.00"}
      </p>
      <p className="text-sm text-gray-600">
        Limit: ${monthlyThreshold}
      </p>
    </div>
  );
}
```

## 🔧 Configuration Per Environment

**Development:**
```typescript
// Use cheaper models and lower thresholds
const config = {
  summarization: {
    provider: "openai",
    model: "gpt-4o-mini", // Cheaper
  },
  embeddings: {
    model: "text-embedding-3-small", // Cheaper
  },
};
```

**Production:**
```typescript
// Use better models for quality
const config = {
  summarization: {
    provider: "openai",
    model: "gpt-4o", // Better quality
  },
  embeddings: {
    model: "text-embedding-3-large", // Better quality
  },
};
```

## 📝 Environment Variables Setup

### Development
```bash
# .env.local
OPENAI_API_KEY=sk-test-...
ANTHROPIC_API_KEY=sk-ant-test-...
```

### Production
```bash
# Vercel Environment Variables
OPENAI_API_KEY=sk-prod-...
ANTHROPIC_API_KEY=sk-ant-prod-...
```

## ✅ Testing Your Integration

### 1. Test Memory Creation
```typescript
// Send a test message
await handleSendMessage("Test message for memory");

// Check if memory was created
const memories = await getConversationMemories(conversationId);
console.log("Memories:", memories.length); // Should be > 0
```

### 2. Test Retrieval
```typescript
// Search for the test message
const results = await retriever.hybrid("Test message", { limit: 5 });
console.log("Retrieved:", results.length); // Should find the test memory
```

### 3. Test Summarization
```typescript
// Manually trigger summary
const summary = await summarize({
  conversationId,
  orgId,
  summaryType: "final",
});
console.log("Summary:", summary.summary);
```

### 4. Test Analytics
```typescript
const analytics = await getMemoryAnalytics(orgId);
console.log("Total memories:", analytics.totals.totalMemories);
console.log("Total cost:", analytics.totals.totalCostUSD);
```

## 🚨 Common Issues

### Issue: "API key not found"
**Solution:** Add `OPENAI_API_KEY` to `.env.local`

### Issue: "No memories retrieved"
**Solution:** Create some test memories first

### Issue: "Embeddings not working"
**Solution:** 
1. Check API key is valid
2. Wait for hourly cron job
3. Or manually trigger: `generateMemoryEmbedding(memoryId)`

### Issue: "High costs"
**Solution:**
1. Check analytics dashboard
2. Adjust expiration policies in config
3. Use smaller embedding models
4. Reduce summarization frequency

## 📚 Next Steps

1. ✅ Test memory creation with a few messages
2. ✅ Verify retrieval works correctly
3. ✅ Generate a test summary
4. ✅ Check analytics dashboard
5. ✅ Set up cost monitoring alerts
6. ✅ Integrate into AI response flow
7. ✅ Deploy to production

## 🎉 You're Ready!

Your memory system is now integrated. Start conversations and watch the memories accumulate, get summarized, and become searchable automatically!

For detailed API documentation, see:
- `packages/backend/convex/memory/README.md`
- `packages/backend/convex/memory/QUICKSTART.md`
