# Sentiment Engine - Quick Start Guide

Get sentiment analysis running in 5 minutes.

## ⚡ Quick Setup

### Step 1: API Keys (Already Done)
Your `.env.local` already has placeholders for:
```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Add your keys if you haven't already.

### Step 2: Deploy Schema
```bash
cd packages/backend
pnpm run dev
```

This deploys 5 new sentiment tables automatically.

### Step 3: Create Default Rules
```typescript
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const createDefaults = useMutation(api.sentiment.rules.createDefaultRules);

// In your setup/onboarding flow:
await createDefaults({
  orgId: currentOrg.id,
  createdBy: currentUser.id,
});
```

## 🎯 Basic Usage

### Analyze a Message
```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function ChatComponent() {
  const analyze = useAction(api.sentiment.analyzer.analyzeMessage);

  const handleMessage = async (messageId, content) => {
    const result = await analyze({
      conversationId,
      messageId,
      orgId: currentOrg.id,
      messageContent: content,
      messageType: "user",
    });

    console.log("Sentiment:", result.sentiment);
    console.log("Intent:", result.intent);
    console.log("Triggers:", result.triggers);
  };
}
```

### View Dashboard
```tsx
import { SentimentDashboard } from "@/components/sentiment/SentimentDashboard";

function AdminPage() {
  return <SentimentDashboard orgId={currentOrg.id} />;
}
```

### Display Sentiment in Conversation
```tsx
import { useConversationSentiment } from "@/lib/sentiment/SentimentService";

function ConversationHeader({ conversationId }) {
  const { latest } = useConversationSentiment(conversationId);

  return (
    <div>
      {latest && (
        <span className="px-2 py-1 rounded bg-blue-100">
          {latest.sentiment} - {latest.intent}
        </span>
      )}
    </div>
  );
}
```

## 🔄 Auto-Integration

### Option 1: Analyze on Message Send
```typescript
// In your existing message handler
const sendMessage = useMutation(api.messages.send);
const analyze = useAction(api.sentiment.analyzer.analyzeMessage);

const handleSend = async (content: string) => {
  // 1. Send message (existing code)
  const message = await sendMessage({ 
    conversationId, 
    content,
    senderType: "user",
  });

  // 2. NEW: Analyze sentiment
  await analyze({
    conversationId,
    messageId: message,
    orgId,
    messageContent: content,
    messageType: "user",
  });
};
```

### Option 2: Background Job
```typescript
// In your messages table mutation
export const send = mutation({
  handler: async (ctx, args) => {
    // Send message
    const messageId = await ctx.db.insert("messages", { /* ... */ });

    // Schedule sentiment analysis
    await ctx.scheduler.runAfter(0, internal.sentiment.analyzer.analyzeMessage, {
      conversationId: args.conversationId,
      messageId,
      orgId: args.orgId,
      messageContent: args.content,
      messageType: "user",
    });

    return messageId;
  },
});
```

## 📊 View Analytics

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function AnalyticsPage() {
  const analytics = useQuery(api.sentiment.analytics.getSentimentAnalytics, {
    orgId: currentOrg.id,
  });

  const trends = useQuery(api.sentiment.analytics.getDailySentimentTrends, {
    orgId: currentOrg.id,
    days: 7,
  });

  return (
    <div>
      <h2>Today: {analytics?.totalMessages} messages</h2>
      <h2>Positive: {analytics?.sentimentDistribution.positive}</h2>
      <h2>Negative: {analytics?.sentimentDistribution.negative}</h2>
    </div>
  );
}
```

## 🎯 Common Patterns

### Pattern 1: Alert on Angry Customer
```typescript
const result = await analyze({ /* ... */ });

if (result.sentiment === "angry" && result.sentimentScore < -0.6) {
  // Alert team
  await notifyTeam({
    title: "Angry Customer Detected",
    conversationId,
  });
}
```

### Pattern 2: Auto-Route VIP
```typescript
if (result.triggers.some(t => t.triggerType === "vip_routing")) {
  // Route to VIP queue
  await routeToQueue({
    conversationId,
    queue: "vip",
  });
}
```

### Pattern 3: Escalate Priority
```typescript
if (result.triggers.some(t => t.triggerType === "priority_increase")) {
  // Already handled by the rule!
  // Conversation priority is automatically updated
  console.log("Priority increased automatically");
}
```

## 🔧 Custom Rules

```typescript
import { useSentimentRules } from "@/lib/sentiment/SentimentService";

function RulesManager() {
  const { create } = useSentimentRules(orgId);

  const createCustomRule = async () => {
    await create({
      name: "Billing Issue Alert",
      priority: 95,
      conditions: {
        intents: ["billing_issue", "refund"],
        sentiments: ["angry", "frustrated"],
        minConfidence: 0.7,
      },
      actions: {
        triggerHandoff: true,
        increasePriority: "high",
        addTags: ["billing", "urgent"],
        notifyTeam: ["billing_team_id"],
      },
      createdBy: currentUser.id,
    });
  };
}
```

## 💡 Tips

1. **Start with defaults** - Use the 5 default rules first
2. **Monitor for a week** - See what triggers are firing
3. **Adjust thresholds** - Fine-tune confidence levels
4. **Add custom rules** - Create rules for your specific needs
5. **Watch costs** - ~$0.0002 per analysis with OpenAI

## 📈 What You Get

After setup, you automatically get:
- ✅ Sentiment detection on every message
- ✅ Intent classification
- ✅ Auto-triggers (handoff, priority, routing)
- ✅ Real-time dashboard
- ✅ Trend analytics
- ✅ Cost tracking

## 🎉 You're Done!

Your sentiment engine is now:
- 🔍 Analyzing every message
- 🎯 Classifying intents
- 🔔 Triggering actions
- 📊 Tracking trends
- 💰 Monitoring costs

No additional setup needed! 🚀
