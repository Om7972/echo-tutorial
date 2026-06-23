# Echo Platform - Quick Reference Guide

## 🚀 Fast Access to Key Functions

### Memory System

```typescript
// Create memory
await createShortTermMemory({
  conversationId, orgId, messageIds, content, tokenCount
});

// Retrieve memories
const memories = await retrieveHybrid({
  conversationId, orgId, query, limit: 5
});

// Generate summary
await summarizeConversation({
  conversationId, orgId, summaryType: "final"
});
```

### Sentiment System

```typescript
// Analyze message
const result = await analyzeMessage({
  conversationId, messageId, orgId, messageContent
});
// Returns: { sentiment, intent, score, triggers }

// Get analytics
const analytics = await getSentimentAnalytics({ orgId });

// Create rule
await createRule({
  orgId, name, priority, conditions, actions
});
```

### Unified Inbox

```typescript
// Get conversations
const conversations = await getInboxConversations({
  orgId, status: ["open"], assignedTo: "me"
});

// Send message
await sendMessage({
  conversationId, content, senderId, senderName
});

// Assign to agent
await assignConversation({
  conversationId, assignedTo: agentId
});
```

## 📊 Database Tables Overview

| System | Table | Purpose |
|--------|-------|---------|
| **Memory** | conversation_memories | Store memories |
| | memory_embeddings | Vector search |
| | memory_summaries | AI summaries |
| **Sentiment** | sentiment_analysis | Analysis results |
| | sentiment_rules | Auto-trigger rules |
| | sentiment_trends | Daily trends |
| **Inbox** | unified_conversations | All conversations |
| | unified_messages | All messages |
| | unified_customers | Customer profiles |

## 🎯 Common Use Cases

### Use Case 1: New Message Flow
```typescript
1. Message arrives → Inbox receives
2. Create/update customer
3. Analyze sentiment
4. Store in memory
5. Check triggers
6. Auto-assign if rule matches
7. Update real-time UI
```

### Use Case 2: Agent Responds
```typescript
1. Agent types message
2. Send via channel API
3. Store in database
4. Update conversation
5. Create memory
6. Index for search
```

### Use Case 3: Customer Support
```typescript
1. Get customer profile
2. View conversation history
3. Check sentiment trends
4. Load relevant memories
5. Generate AI suggestions
6. Respond with context
```

## 💰 Cost Tracking

| Operation | Cost | Provider |
|-----------|------|----------|
| Sentiment analysis | $0.0002 | OpenAI |
| Summary generation | $0.10 | OpenAI |
| Embedding generation | $0.00002 | OpenAI |
| Memory retrieval | FREE | Convex |
| Real-time updates | FREE | Convex |

## 🔧 Environment Variables

```bash
# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=https://...

# Channels (as needed)
WHATSAPP_TOKEN=...
TELEGRAM_BOT_TOKEN=...
```

## 📈 Performance Targets

- Message delivery: <500ms
- Sentiment analysis: 1-2s
- Memory retrieval: <100ms
- Summarization: 3-10s
- Search: <200ms
- Real-time updates: Instant

## 🎨 React Hooks Quick Reference

```typescript
// Memory
const { createShortTerm } = useMemoryManager(orgId);
const { hybrid } = useMemoryRetriever(conversationId, orgId);
const { summarize } = useMemorySummarizer();

// Sentiment
const { analyzeMessage } = useSentimentAnalyzer(orgId);
const { analytics } = useSentimentAnalytics(orgId);
const { rules, create } = useSentimentRules(orgId);

// Inbox
const conversations = useQuery(api.inbox.conversations.getInboxConversations, { orgId });
const sendMessage = useMutation(api.inbox.conversations.sendMessage);
```

## 🔍 Search & Filter Examples

```typescript
// Filter by channel
{ channelId: whatsappChannelId }

// Filter by status
{ status: ["open", "pending"] }

// Filter by assignment
{ assignedTo: "me" }  // or "unassigned"

// Filter by priority
{ priority: ["high", "urgent"] }

// Unread only
{ hasUnread: true }

// Multiple filters
{
  channelId,
  status: ["open"],
  priority: ["high"],
  hasUnread: true,
  assignedTo: "me"
}
```

## 🎯 Auto-Trigger Rules

```typescript
// Default Rules Created:
1. Angry + High Confidence → Handoff
2. Refund Intent → High Priority
3. 3 Consecutive Negative → Handoff
4. Technical + Urgent → Medium Priority
5. Pricing + VIP → VIP Routing

// Create Custom Rule:
{
  conditions: {
    sentiments: ["angry"],
    minConfidence: 0.75
  },
  actions: {
    triggerHandoff: true,
    increasePriority: "high",
    addTags: ["urgent"]
  }
}
```

## 📱 Channel Types

- `website_widget` - Website chat
- `email` - Email support
- `whatsapp` - WhatsApp Business
- `telegram` - Telegram bot
- `instagram` - Instagram DM
- `facebook_messenger` - FB Messenger
- `sms` - SMS messages
- `slack` - Slack integration
- `discord` - Discord bot

## 🎨 Priority Levels

- `urgent` - Immediate attention (SLA: 5 min)
- `high` - High priority (SLA: 15 min)
- `medium` - Normal priority (SLA: 1 hour)
- `low` - Low priority (SLA: 4 hours)

## 📊 Status Values

- `open` - Active conversation
- `pending` - Waiting for response
- `resolved` - Issue resolved
- `closed` - Conversation closed

## 🎯 Routing Methods

- `round_robin` - Distribute evenly
- `least_active` - Assign to least busy
- `manual` - Agent claims
- `auto_routing` - Rule-based

## 💡 Tips & Best Practices

1. **Always filter by orgId** for multi-tenancy
2. **Use hybrid retrieval** for best memory results
3. **Set confidence thresholds** >0.7 for triggers
4. **Monitor costs daily** in analytics
5. **Merge customers** when duplicates detected
6. **Index conversations** for fast search
7. **Use real-time queries** for live updates

## 🚨 Common Issues & Solutions

**High costs?**
→ Use Anthropic, reduce summarization frequency

**Slow search?**
→ Ensure search index is updated

**No triggers firing?**
→ Check rule confidence thresholds

**Duplicate customers?**
→ Run merge operation

**Messages not arriving?**
→ Check channel webhook configuration

## 📚 Documentation Links

- Memory: `packages/backend/convex/memory/README.md`
- Sentiment: `packages/backend/convex/sentiment/README.md`
- Inbox: `UNIFIED_INBOX_IMPLEMENTATION.md`
- Complete: `COMPLETE_IMPLEMENTATION_SUMMARY.md`

## 🎉 You're Ready!

Everything is deployed and ready to use. Start:
1. Creating conversations
2. Analyzing sentiment
3. Storing memories
4. Building UI

Happy coding! 🚀
