# Echo Platform - Quick Start Guide

**Last Updated**: June 24, 2026

## Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `CONVEX_DEPLOYMENT` - From Convex dashboard
- `NEXT_PUBLIC_CONVEX_URL` - From Convex dashboard
- `OPENAI_API_KEY` - From OpenAI dashboard
- `RESEND_API_KEY` - From Resend dashboard

### 3. Run Development
```bash
# Terminal 1: Start Convex
npx convex dev

# Terminal 2: Start Next.js
npm run dev
```

Visit: http://localhost:3000

---

## Common Tasks

### Log an Audit Event
```typescript
import { useLogAudit } from "@/lib/audit/AuditService";

const logAudit = useLogAudit();
await logAudit({
  orgId: "org_123",
  userId: "user_456",
  action: "login",
  details: { method: "password" },
  success: true,
});
```

### Send a Notification
```typescript
import { useQueueNotification } from "@/lib/notifications/NotificationService";

const queue = useQueueNotification();
await queue({
  orgId: "org_123",
  priority: "high",
  notificationType: "human_handoff",
  recipientEmail: "support@example.com",
  subject: "Customer needs help",
  htmlBody: "<p>Customer escalation</p>",
});
```

### Create a Webhook
```typescript
import { useCreateWebhook } from "@/lib/webhooks/WebhookService";

const create = useCreateWebhook();
await create({
  orgId: "org_123",
  name: "Slack Notifications",
  url: "https://hooks.slack.com/...",
  events: ["conversation.created"],
  isActive: true,
  createdBy: userId,
});
```

### Trigger Sentiment Analysis
```typescript
import { useAnalyzeSentiment } from "@/lib/sentiment/SentimentService";

const analyze = useAnalyzeSentiment();
const result = await analyze({
  orgId: "org_123",
  conversationId: convId,
  messageId: msgId,
  content: "I'm very frustrated!",
  provider: "openai",
});

console.log("Sentiment:", result.sentiment);
console.log("Intent:", result.intent);
```

### Generate Analytics
```typescript
import { useEnterpriseAnalytics } from "@/lib/analytics/AnalyticsService";

const analytics = useEnterpriseAnalytics(orgId, {
  dateFrom: "2026-06-01",
  dateTo: "2026-06-30",
});

console.log("Total conversations:", analytics?.totalConversations);
console.log("AI accuracy:", analytics?.aiAccuracyRate);
```

---

## Available Components

### Dashboards
```tsx
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import { WebhookDashboard } from "@/components/webhooks/WebhookDashboard";
import { EnterpriseDashboard } from "@/components/analytics/EnterpriseDashboard";
import { NotificationsDashboard } from "@/components/notifications/NotificationsDashboard";
import { SentimentDashboard } from "@/components/sentiment/SentimentDashboard";

<AuditDashboard orgId="org_123" />
<WebhookDashboard orgId="org_123" userId="user_456" />
<EnterpriseDashboard orgId="org_123" />
<NotificationsDashboard orgId="org_123" />
<SentimentDashboard orgId="org_123" />
```

---

## API Quick Reference

### Convex Functions

#### Queries (Read Data)
```typescript
useQuery(api.audit.logs.getAuditLogs, { orgId, limit: 100 })
useQuery(api.webhooks.endpoints.getWebhooks, { orgId })
useQuery(api.notifications.queue.getQueuedNotifications, { orgId })
useQuery(api.sentiment.analysis.getSentimentAnalyses, { orgId })
useQuery(api.analytics.enterprise.getEnterpriseAnalytics, { orgId, dateFrom, dateTo })
```

#### Mutations (Write Data)
```typescript
useMutation(api.audit.logs.logAudit)
useMutation(api.webhooks.endpoints.createWebhook)
useMutation(api.notifications.queue.queueNotification)
useMutation(api.sentiment.analysis.analyzeSentiment)
```

#### Actions (External Calls)
```typescript
useAction(api.webhooks.delivery.triggerWebhook)
useAction(api.sentiment.analysis.analyzeSentiment)
useAction(api.notifications.queue.processQueue)
```

---

## Folder Structure

```
echo-tutorial/
├── apps/
│   └── web/
│       ├── app/                    # Next.js 15 routes
│       ├── components/
│       │   ├── audit/              # Audit dashboard
│       │   ├── webhooks/           # Webhook management
│       │   ├── notifications/      # Notification UI
│       │   ├── sentiment/          # Sentiment dashboard
│       │   └── analytics/          # Analytics dashboard
│       └── lib/
│           ├── audit/              # Audit helpers
│           ├── webhooks/           # Webhook helpers
│           ├── notifications/      # Notification helpers
│           ├── sentiment/          # Sentiment helpers
│           └── analytics/          # Analytics helpers
├── packages/
│   └── backend/
│       └── convex/
│           ├── audit/              # Audit backend
│           ├── webhooks/           # Webhook backend
│           ├── notifications/      # Notification backend
│           ├── sentiment/          # Sentiment backend
│           ├── analytics/          # Analytics backend
│           └── schema.ts           # Database schema (61 tables)
└── docs/
    ├── AUDIT_AND_WEBHOOKS.md
    ├── NOTIFICATIONS_AND_ANALYTICS.md
    ├── AUTOMATION_AND_CSAT.md
    ├── IMPLEMENTATION_SUMMARY.md
    └── QUICK_START.md (this file)
```

---

## Database Tables Quick Reference

### Audit System (1 table)
- `audit_logs` - All system activities

### Webhook System (3 tables)
- `webhooks` - Endpoint configurations
- `webhook_deliveries` - Delivery records
- `webhook_logs` - Detailed logs

### Notification System (3 tables)
- `notification_templates` - Email templates
- `notification_queue` - Outgoing emails
- `notification_logs` - Delivery history

### Analytics System (2 tables)
- `enterprise_analytics` - Daily metrics
- `analytics_metrics` - Real-time events

### Sentiment System (5 tables)
- `sentiment_analysis` - Analysis results
- `sentiment_triggers` - Auto-trigger rules
- `sentiment_history` - Historical tracking
- `intent_analysis` - Intent classification
- `sentiment_analytics` - Aggregated stats

---

## Troubleshooting

### Convex Not Connecting
```bash
# Check if Convex is running
npx convex dev

# Verify environment variables
echo $CONVEX_DEPLOYMENT
echo $NEXT_PUBLIC_CONVEX_URL
```

### TypeScript Errors
```bash
# Restart TypeScript server in VSCode
Cmd+Shift+P > "TypeScript: Restart TS Server"

# Check for type errors
npm run type-check
```

### Build Errors
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Webhook Not Firing
1. Check webhook is active (`isActive: true`)
2. Verify event is subscribed
3. Test webhook manually:
```typescript
const test = useMutation(api.webhooks.endpoints.testWebhook);
await test({ webhookId });
```

---

## Performance Tips

### 1. Use Indexes
All queries should use an index. Check the schema for available indexes.

### 2. Limit Results
Always use `limit` parameter:
```typescript
useQuery(api.audit.logs.getAuditLogs, { orgId, limit: 50 })
```

### 3. Paginate
For large datasets, implement pagination:
```typescript
const [cursor, setCursor] = useState(null);
const logs = useQuery(api.audit.logs.getAuditLogs, { 
  orgId, 
  cursor,
  limit: 20 
});
```

### 4. Batch Operations
Group related operations:
```typescript
// Bad: Multiple separate calls
await logAudit({ ... });
await logAudit({ ... });
await logAudit({ ... });

// Good: Batch in one transaction
await batchLogAudit([
  { ... },
  { ... },
  { ... }
]);
```

---

## Security Best Practices

### 1. Verify User Permissions
```typescript
export const secureQuery = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    // Verify user has access to org
    const hasAccess = await verifyOrgAccess(identity.subject, args.orgId);
    if (!hasAccess) throw new Error("Forbidden");
    
    // Proceed with query
    return await ctx.db.query("table").collect();
  },
});
```

### 2. Validate Input
```typescript
import { v } from "convex/values";

export const mutation = mutation({
  args: {
    email: v.string(), // Basic validation
    age: v.number(),
  },
  handler: async (ctx, args) => {
    // Additional validation
    if (!isValidEmail(args.email)) {
      throw new Error("Invalid email format");
    }
    if (args.age < 0 || args.age > 150) {
      throw new Error("Invalid age");
    }
    
    // Proceed
  },
});
```

### 3. Sanitize Data
```typescript
// Remove sensitive data before logging
const sanitizedUser = {
  id: user.id,
  email: user.email,
  // Don't log: password, apiKey, secret
};

await logAudit({
  details: sanitizedUser,
});
```

### 4. Rate Limit
```typescript
// Implement rate limiting for sensitive operations
const rateLimiter = new Map();

export const rateLimitedMutation = mutation({
  handler: async (ctx, args) => {
    const userId = ctx.auth.getUserIdentity().subject;
    const lastCall = rateLimiter.get(userId);
    
    if (lastCall && Date.now() - lastCall < 1000) {
      throw new Error("Rate limit exceeded");
    }
    
    rateLimiter.set(userId, Date.now());
    
    // Proceed
  },
});
```

---

## Useful Commands

### Development
```bash
npm run dev          # Start Next.js
npx convex dev       # Start Convex
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

### Testing
```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Build & Deploy
```bash
npm run build        # Build for production
npm run start        # Start production server
npx convex deploy    # Deploy backend
```

---

## Resources

### Documentation
- [Convex Docs](https://docs.convex.dev)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Resend Docs](https://resend.com/docs)
- [OpenAI Docs](https://platform.openai.com/docs)

### Internal Docs
- `/docs/AUDIT_AND_WEBHOOKS.md` - Audit & Webhooks
- `/docs/NOTIFICATIONS_AND_ANALYTICS.md` - Notifications & Analytics
- `/docs/IMPLEMENTATION_SUMMARY.md` - Complete overview

### Community
- [Convex Discord](https://convex.dev/community)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)

---

## Need Help?

1. Check the documentation in `/docs`
2. Review code examples in this guide
3. Search existing issues
4. Ask in team chat
5. Create a new issue with:
   - What you're trying to do
   - What's happening
   - Error messages
   - Steps to reproduce

---

**Happy coding! 🚀**
