# AI Sentiment & Intent Analysis Engine

Advanced sentiment detection and intent classification system with auto-triggers, real-time analytics, and intelligent routing.

## 🎯 Features

### Sentiment Detection
- ✅ **8 Sentiment Types:**
  - Positive
  - Negative
  - Neutral
  - Angry
  - Urgent
  - Confused
  - Frustrated
  - Satisfied

### Intent Classification
- ✅ **10 Intent Types:**
  - Refund
  - Pricing
  - Technical Issue
  - Feature Request
  - Complaint
  - General Inquiry
  - Feedback
  - Cancel Subscription
  - Billing Issue
  - Account Issue

### Confidence Scores
- Sentiment score: -1 (very negative) to 1 (very positive)
- Confidence level: 0 to 1
- Intent confidence tracking
- Secondary intent detection

### Auto-Triggers
- ✅ **Human Handoff** - Transfer to human agent
- ✅ **Priority Increase** - Escalate urgency (low/medium/high)
- ✅ **VIP Routing** - Route to premium support
- ✅ **Supervisor Alerts** - Notify management
- ✅ **Tag Assignment** - Auto-add conversation tags

### Analytics & Charts
- ✅ Daily sentiment trends
- ✅ Hourly breakdowns
- ✅ Intent distribution
- ✅ Trigger statistics
- ✅ Period comparisons
- ✅ Real-time updates
- ✅ Cost tracking

## 📊 Database Schema

### Tables Created
- `sentiment_analysis` - Analysis results with sentiment and intent
- `sentiment_triggers` - Triggered actions log
- `sentiment_trends` - Daily and hourly aggregations
- `sentiment_rules` - Configurable trigger rules
- `sentiment_analytics` - Daily analytics summaries

## 🚀 Quick Start

### 1. Analyze a Message

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const analyze = useAction(api.sentiment.analyzer.analyzeMessage);

const result = await analyze({
  conversationId: conversationId,
  messageId: messageId,
  orgId: "org_123",
  messageContent: "I'm really frustrated! This doesn't work!",
  messageType: "user",
  provider: "openai", // or "anthropic"
});

console.log("Sentiment:", result.sentiment); // "frustrated"
console.log("Intent:", result.intent); // "complaint"
console.log("Score:", result.sentimentScore); // -0.7
```

### 2. View Sentiment for Conversation

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const sentiment = useQuery(api.sentiment.analyzer.getConversationSentiment, {
  conversationId: conversationId,
});

// Latest sentiment
const latest = sentiment?.[0];
console.log("Latest sentiment:", latest?.sentiment);
console.log("Latest intent:", latest?.intent);
```

### 3. Get Analytics Dashboard

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const analytics = useQuery(api.sentiment.analytics.getSentimentAnalytics, {
  orgId: "org_123",
});

console.log("Total messages:", analytics?.totalMessages);
console.log("Sentiment distribution:", analytics?.sentimentDistribution);
console.log("Intent distribution:", analytics?.intentDistribution);
console.log("Trigger rate:", analytics?.triggers.handoffRate);
```

### 4. Create Sentiment Rules

```typescript
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const createRule = useMutation(api.sentiment.rules.createRule);

await createRule({
  orgId: "org_123",
  name: "Angry Customer Alert",
  priority: 100,
  conditions: {
    sentiments: ["angry", "frustrated"],
    minConfidence: 0.7,
  },
  actions: {
    triggerHandoff: true,
    increasePriority: "high",
    routeToVIP: false,
    addTags: ["urgent", "angry-customer"],
  },
  createdBy: "user_123",
});
```

## 🔧 Auto-Analysis Integration

### Automatic Analysis on Message Send

```typescript
import { useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function ChatComponent() {
  const sendMessage = useMutation(api.messages.send);
  const analyze = useAction(api.sentiment.analyzer.analyzeMessage);

  const handleSendMessage = async (content: string) => {
    // 1. Send message
    const message = await sendMessage({
      conversationId,
      content,
      senderType: "user",
    });

    // 2. Analyze sentiment
    await analyze({
      conversationId,
      messageId: message,
      orgId,
      messageContent: content,
      messageType: "user",
    });

    return message;
  };

  return <ChatInput onSend={handleSendMessage} />;
}
```

## 📈 Dashboard Components

### Sentiment Dashboard

```tsx
import { SentimentDashboard } from "@/components/sentiment/SentimentDashboard";

function AdminPanel() {
  return (
    <div>
      <h1>Sentiment Analysis</h1>
      <SentimentDashboard orgId={currentOrg.id} />
    </div>
  );
}
```

### Real-time Sentiment Display

```tsx
import { useConversationSentiment } from "@/lib/sentiment/SentimentService";
import { SentimentUtils } from "@/lib/sentiment/SentimentService";

function ConversationHeader({ conversationId }) {
  const { latest } = useConversationSentiment(conversationId);

  if (!latest) return null;

  return (
    <div className="flex items-center gap-2">
      <span>{SentimentUtils.getSentimentEmoji(latest.sentiment)}</span>
      <span className="text-sm">
        {latest.sentiment} - {SentimentUtils.formatIntent(latest.intent)}
      </span>
    </div>
  );
}
```

## 🎯 Trigger Rules

### Default Rules (Auto-Created)

1. **Angry Customer - Immediate Handoff**
   - Condition: Angry or frustrated sentiment with >70% confidence
   - Action: Human handoff + high priority + tags

2. **Refund Request - Priority Increase**
   - Condition: Refund intent with >75% confidence
   - Action: High priority + refund tag

3. **3 Consecutive Negative - Handoff**
   - Condition: 3 negative messages in a row
   - Action: Human handoff + high priority

4. **Technical Issue - Priority**
   - Condition: Technical issue intent + urgent/frustrated sentiment
   - Action: Medium priority + technical tag

5. **Urgent Pricing - VIP Route**
   - Condition: Pricing intent + urgent sentiment + VIP customer
   - Action: VIP routing + high priority

### Create Custom Rules

```typescript
const createRule = useMutation(api.sentiment.rules.createRule);

// Example: Alert supervisor for billing issues
await createRule({
  orgId,
  name: "Billing Issue Alert",
  priority: 95,
  conditions: {
    intents: ["billing_issue", "refund"],
    sentiments: ["angry", "frustrated"],
    minConfidence: 0.75,
  },
  actions: {
    triggerHandoff: true,
    increasePriority: "high",
    notifyTeam: ["supervisor_123"],
    addTags: ["billing", "urgent"],
  },
  createdBy: userId,
});
```

## 📊 Analytics Examples

### Daily Trends

```typescript
const trends = useQuery(api.sentiment.analytics.getDailySentimentTrends, {
  orgId,
  days: 7,
});

// Chart data
const chartData = trends?.map(trend => ({
  date: trend.date,
  positive: trend.positive,
  negative: trend.negative,
  angry: trend.angry,
}));
```

### Period Comparison

```typescript
const comparison = useQuery(api.sentiment.analytics.getSentimentComparison, {
  orgId,
  days: 7, // Compare last 7 days to previous 7
});

console.log("Current period:", comparison?.current);
console.log("Previous period:", comparison?.previous);
console.log("Change:", comparison?.change);
```

### Real-time Overview

```typescript
const overview = useQuery(api.sentiment.analytics.getRealtimeSentimentOverview, {
  orgId,
});

console.log("Today's analyses:", overview?.today);
console.log("Last 24h:", overview?.last24h);
console.log("Recent 10:", overview?.recent);
```

## 💰 Cost Tracking

### Per-Analysis Costs

**OpenAI (gpt-4o-mini):**
- ~$0.0002 per analysis
- ~$0.20 per 1,000 messages

**Anthropic (claude-3-haiku):**
- ~$0.0001 per analysis
- ~$0.10 per 1,000 messages

### Cost Optimization

```typescript
// Use cheaper model for high-volume
const result = await analyze({
  // ... params
  provider: "anthropic", // Cheaper option
});

// Get cost analytics
const analytics = useQuery(api.sentiment.analytics.getSentimentAnalytics, {
  orgId,
});

console.log("Total cost:", analytics?.costMetrics.totalCost);
console.log("Avg per message:", analytics?.costMetrics.avgCostPerMessage);
```

## 🔔 Webhooks & Notifications

### React to Triggers

```typescript
// In your message handler
const result = await analyze({
  conversationId,
  messageId,
  orgId,
  messageContent,
  messageType: "user",
});

if (result.triggers.length > 0) {
  for (const trigger of result.triggers) {
    if (trigger.triggerType === "human_handoff") {
      // Notify agents
      await notifyAgents({
        conversationId,
        reason: trigger.reason,
      });
    }
  }
}
```

## 🎨 UI Components

### Sentiment Badge

```tsx
function SentimentBadge({ sentiment }: { sentiment: string }) {
  const emoji = SentimentUtils.getSentimentEmoji(sentiment);
  const color = SentimentUtils.getSentimentColor(sentiment);
  
  return (
    <span className={`px-2 py-1 rounded bg-${color}-100 text-${color}-800`}>
      {emoji} {sentiment}
    </span>
  );
}
```

### Intent Icon

```tsx
function IntentIcon({ intent }: { intent: string }) {
  const icon = SentimentUtils.getIntentIcon(intent);
  const label = SentimentUtils.formatIntent(intent);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
```

## 🔍 Advanced Features

### Secondary Intents

```typescript
// Analysis returns multiple possible intents
const result = await analyze({ /* ... */ });

console.log("Primary:", result.intent);
console.log("Secondary:", result.secondaryIntents);
// [{ intent: "complaint", score: 0.6 }, { intent: "refund", score: 0.3 }]
```

### Consecutive Negative Detection

```typescript
// Rule triggers after N consecutive negative messages
await createRule({
  orgId,
  name: "Multiple Negatives",
  conditions: {
    consecutiveNegative: 3, // After 3 in a row
  },
  actions: {
    triggerHandoff: true,
  },
  // ...
});
```

### Customer Tier Routing

```typescript
// Different handling for VIP customers
await createRule({
  orgId,
  name: "VIP Priority",
  conditions: {
    customerTier: ["vip", "premium"],
    sentiments: ["negative", "urgent"],
  },
  actions: {
    routeToVIP: true,
    increasePriority: "high",
  },
  // ...
});
```

## 📝 Best Practices

1. **Analyze user messages only** - Skip assistant messages to save costs
2. **Set confidence thresholds** - Only trigger on high-confidence analyses
3. **Monitor false positives** - Review trigger logs regularly
4. **Use rule priorities** - Higher numbers = executed first
5. **Track costs** - Monitor daily spend on sentiment analysis
6. **Test rules thoroughly** - Use test conversations before production
7. **Update rules iteratively** - Adjust based on actual performance

## 🚨 Troubleshooting

**Problem:** "Analysis not triggering"
- Check if message type is "user"
- Verify API keys are set
- Check message length (min 10 chars)

**Problem:** "No triggers firing"
- Review rule conditions
- Check confidence thresholds
- Verify rules are active

**Problem:** "High costs"
- Use Anthropic for cheaper analysis
- Filter short messages
- Adjust analysis frequency

## 📚 API Reference

See full documentation in:
- `analyzer.ts` - Core analysis engine
- `rules.ts` - Rule management
- `analytics.ts` - Analytics and reporting

## 🎉 Ready to Use!

Your sentiment engine is now ready to:
- Detect emotions in real-time
- Classify user intentions
- Auto-trigger human handoffs
- Route VIP customers
- Track sentiment trends
- Provide actionable insights

Start analyzing! 🚀
