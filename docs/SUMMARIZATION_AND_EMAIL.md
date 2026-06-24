# Automatic Summarization & Email Support

Complete implementation of AI-powered conversation summarization and full-featured email support.

## Table of Contents

1. [Automatic Summarization](#automatic-summarization)
2. [Email Support](#email-support)
3. [Database Schema](#database-schema)
4. [Backend Functions](#backend-functions)
5. [React Components](#react-components)
6. [Usage Examples](#usage-examples)
7. [Configuration](#configuration)

---

## Automatic Summarization

AI-powered conversation analysis with actionable insights.

### Features

#### 1. Short Summary
- 1-2 sentence overview
- Quick understanding of conversation
- Executive summary style

#### 2. Detailed Summary
- Comprehensive analysis
- All key points covered
- Full context preserved

#### 3. Root Cause Analysis
- Identifies underlying issues
- Problem diagnosis
- Pattern recognition

#### 4. Resolution Steps
- Step-by-step solutions
- Actionable guidance
- Best practice recommendations

#### 5. Sentiment Analysis
- Overall sentiment detection
- Sentiment score (-1 to 1)
- Emotional tone analysis

#### 6. Action Items
- Extracted tasks
- Priority levels (low, medium, high)
- Due dates
- Assignment tracking
- Completion status

#### 7. Tags
- Automatic categorization
- Topic extraction
- Easy filtering

### AI Providers

**OpenAI (GPT-4)**
- Model: `gpt-4`
- Cost: ~$0.03 per 1K input tokens, $0.06 per 1K output tokens
- Response format: JSON
- Temperature: 0.3 (consistent)

**Anthropic (Claude)**
- Model: `claude-3-sonnet-20240229`
- Cost: ~$0.003 per 1K input tokens, $0.015 per 1K output tokens
- Max tokens: 2000
- JSON parsing from text response

### Generation Process

1. **Collect Messages**: Gather all conversation messages
2. **Format Text**: Create conversation transcript
3. **Call AI API**: Send to OpenAI or Anthropic
4. **Parse Response**: Extract structured data
5. **Save Summary**: Store in database
6. **Update Status**: Mark as completed

### Dynamic Updates

Summaries can be regenerated when:
- New messages added
- Conversation closed
- Manual trigger
- Scheduled refresh

Old summaries are marked as `outdated` when new ones are generated.

### Storage

Summaries stored in `conversation_summaries` table with:
- Full summary data
- Generation metadata
- Cost tracking
- Version history
- Status tracking

### Export

**PDF Export**
- Print-friendly format
- All summary sections
- Metadata included
- Browser print functionality

---

## Email Support

Full-featured email client with IMAP/SMTP, threading, and tracking.

### Features

#### 1. IMAP Support
- Connect to any IMAP server
- Gmail, Outlook, custom servers
- SSL/TLS support
- Automatic syncing
- Folder management

#### 2. SMTP Support
- Send emails via SMTP
- Resend integration
- Delivery tracking
- Error handling
- Retry logic

#### 3. Inbound Email Parsing
- RFC 2822 compliance
- Header parsing
- HTML/Plain text support
- Attachment handling
- Spam detection

#### 4. Threading
- Automatic thread detection
- `In-Reply-To` header
- `References` header
- Thread grouping
- Conversation linking

#### 5. Attachments
- Multiple attachments
- File type detection
- Size tracking
- Storage integration
- Download support

#### 6. Reply from Dashboard
- Inline replies
- Forward emails
- Quote original
- Rich text editing
- Signature insertion

#### 7. Templates
- Reusable templates
- Variable substitution
- Category organization
- Usage tracking
- Quick selection

#### 8. Auto Close
- Configurable timeout
- Automatic resolution
- Inactivity detection
- Notification before close

#### 9. Email Signatures
- Per-account signatures
- HTML support
- Automatic insertion
- Professional formatting

#### 10. Spam Filtering
- Spam score calculation
- Automatic flagging
- Manual override
- Whitelist/blacklist

#### 11. Email History
- Complete message history
- Thread view
- Search functionality
- Archive support

#### 12. Tracking Pixels
- Open tracking
- Click tracking
- Location detection
- User agent logging
- Analytics dashboard

#### 13. Delivery Logs
- Send status
- Delivery confirmation
- Bounce tracking
- Failure reasons
- Retry attempts

#### 14. Resend Integration
- Modern email API
- Reliable delivery
- Webhook support
- Analytics included
- Easy setup

### Email Flow

**Inbound:**
1. Email received via IMAP/webhook
2. Parse headers and body
3. Check spam score
4. Create thread or add to existing
5. Link to conversation
6. Notify team

**Outbound:**
1. Compose email
2. Add signature
3. Insert tracking pixel (optional)
4. Send via SMTP/Resend
5. Log delivery
6. Track opens/clicks

### Threading Algorithm

```
1. Check In-Reply-To header
2. Check References header
3. Match subject (Re: prefix)
4. Group by thread ID
5. Update thread metadata
```

### Spam Detection

Factors considered:
- Spam score from provider
- Sender reputation
- Content analysis
- Blacklist check
- User feedback

Threshold: Score > 5.0 = spam

---

## Database Schema

### Summarization Tables

#### conversation_summaries

```typescript
{
  orgId: string
  conversationId: Id<"unified_conversations">
  customerId?: Id<"unified_customers">
  
  // Summaries
  shortSummary: string
  detailedSummary: string
  
  // Analysis
  rootCause?: string
  resolutionSteps?: string[]
  sentiment?: string
  sentimentScore?: number
  
  // Action items
  actionItems: Array<{
    description: string
    priority: "low" | "medium" | "high"
    assignedTo?: string
    dueDate?: number
    completed: boolean
  }>
  tags: string[]
  categories?: string[]
  
  // Generation metadata
  provider: "openai" | "anthropic"
  model: string
  tokensUsed: number
  costUSD: number
  
  // Status
  status: "generating" | "completed" | "failed" | "outdated"
  errorMessage?: string
  
  // Versioning
  version: number
  previousVersionId?: Id<"conversation_summaries">
  
  // Statistics
  messageCount: number
  timeRangeStart: number
  timeRangeEnd: number
  
  // Timestamps
  createdAt: number
  updatedAt: number
  generatedBy?: string
}
```

**Indexes:**
- `by_org_id`
- `by_conversation_id`
- `by_org_conversation`
- `by_status`
- `by_org_status`
- `by_version`

#### summary_generation_jobs

```typescript
{
  orgId: string
  conversationId: Id<"unified_conversations">
  
  // Job config
  summaryType: "manual" | "auto" | "scheduled"
  trigger?: string
  
  // Status
  status: "pending" | "processing" | "completed" | "failed"
  progress?: number
  
  // Result
  summaryId?: Id<"conversation_summaries">
  errorMessage?: string
  
  // Timestamps
  createdAt: number
  startedAt?: number
  completedAt?: number
  
  // Resources
  tokensUsed?: number
  costUSD?: number
}
```

**Indexes:**
- `by_org_id`
- `by_conversation_id`
- `by_status`
- `by_org_status`

### Email Tables

#### email_accounts

```typescript
{
  orgId: string
  
  // Account details
  email: string
  displayName: string
  provider: "gmail" | "outlook" | "imap" | "custom"
  
  // IMAP config
  imapHost?: string
  imapPort?: number
  imapUsername?: string
  imapPassword?: string // Encrypted
  imapUseSsl?: boolean
  
  // SMTP config
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string // Encrypted
  smtpUseSsl?: boolean
  
  // Settings
  signature?: string
  autoCloseAfterDays?: number
  enableSpamFilter: boolean
  enableTrackingPixels: boolean
  
  // Status
  status: "active" | "disabled" | "error"
  lastSyncAt?: number
  lastError?: string
  
  // Timestamps
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_org_id`
- `by_email`
- `by_org_status`

#### email_messages

```typescript
{
  orgId: string
  emailAccountId: Id<"email_accounts">
  conversationId?: Id<"unified_conversations">
  
  // Email identifiers
  messageId: string // RFC 2822 Message-ID
  threadId?: string
  inReplyTo?: string
  references?: string[]
  
  // Sender/Recipients
  from: { email: string, name?: string }
  to: Array<{ email: string, name?: string }>
  cc?: Array<{ email: string, name?: string }>
  bcc?: Array<{ email: string, name?: string }>
  
  // Content
  subject: string
  bodyText?: string
  bodyHtml?: string
  
  // Attachments
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    storageId?: Id<"_storage">
    url?: string
  }>
  
  // Direction and status
  direction: "inbound" | "outbound"
  status: "received" | "sending" | "sent" | "failed" | "bounced" | "spam"
  
  // Tracking
  isRead: boolean
  isStarred: boolean
  isSpam: boolean
  spamScore?: number
  
  // Delivery tracking
  sentAt?: number
  deliveredAt?: number
  openedAt?: number
  clickedAt?: number
  bouncedAt?: number
  
  // Tracking pixel
  trackingPixelId?: string
  openCount?: number
  clickCount?: number
  
  // Metadata
  headers?: any
  labels?: string[]
  errorMessage?: string
  
  // Timestamps
  receivedAt: number
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_org_id`
- `by_email_account`
- `by_conversation_id`
- `by_message_id`
- `by_thread_id`
- `by_org_direction`
- `by_org_status`
- `by_received_at`

#### email_templates

```typescript
{
  orgId: string
  
  // Template details
  name: string
  subject: string
  bodyHtml: string
  bodyText?: string
  
  // Categorization
  category?: string
  tags?: string[]
  
  // Usage
  usageCount: number
  lastUsedAt?: number
  
  // Variables
  variables?: Array<{
    name: string
    description?: string
    defaultValue?: string
  }>
  
  // Metadata
  createdBy?: string
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_org_id`
- `by_category`
- `by_usage`

#### email_delivery_logs

```typescript
{
  orgId: string
  emailMessageId: Id<"email_messages">
  
  // Event details
  event: "queued" | "sent" | "delivered" | "opened" | 
         "clicked" | "bounced" | "complained" | "failed"
  
  // Event data
  recipientEmail: string
  userAgent?: string
  ipAddress?: string
  location?: {
    country?: string
    city?: string
  }
  
  // Link tracking
  linkUrl?: string
  
  // Error details
  errorCode?: string
  errorMessage?: string
  bounceType?: "hard" | "soft" | "complaint"
  
  // Metadata
  metadata?: any
  
  // Timestamp
  timestamp: number
}
```

**Indexes:**
- `by_org_id`
- `by_email_message`
- `by_event`
- `by_org_timestamp`

#### email_threads

```typescript
{
  orgId: string
  threadId: string
  conversationId?: Id<"unified_conversations">
  
  // Thread details
  subject: string
  participants: Array<{
    email: string
    name?: string
  }>
  
  // Statistics
  messageCount: number
  lastMessageAt: number
  
  // Status
  isRead: boolean
  isStarred: boolean
  
  // Timestamps
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_org_id`
- `by_thread_id`
- `by_conversation_id`
- `by_org_updated`

---

## Backend Functions

### Summarization Functions

**`summarization/generator.ts`**

- `generateSummary(action)` - Generate AI summary
- `getSummary(query)` - Get conversation summary
- `getSummaries(query)` - Get all summaries
- `updateSummary(mutation)` - Update summary
- `completeActionItem(mutation)` - Mark action complete
- Internal functions for job management

### Email Functions

**`email/accounts.ts`**

- `createAccount(mutation)` - Create email account
- `getAccounts(query)` - Get accounts
- `updateAccount(mutation)` - Update account
- `deleteAccount(mutation)` - Delete account
- `updateLastSync(mutation)` - Update sync time

**`email/messages.ts`**

- `sendEmail(action)` - Send email via SMTP/Resend
- `receiveEmail(mutation)` - Process inbound email
- `getConversationEmails(query)` - Get emails for conversation
- `getThread(query)` - Get email thread
- `markAsRead(mutation)` - Mark as read
- `toggleStar(mutation)` - Star/unstar

**`email/templates.ts`**

- `createTemplate(mutation)` - Create template
- `getTemplates(query)` - Get templates
- `getTemplate(query)` - Get single template
- `updateTemplate(mutation)` - Update template
- `deleteTemplate(mutation)` - Delete template
- `incrementUsage(mutation)` - Track usage
- `renderTemplate(query)` - Render with variables

**`email/threads.ts`**

- `createThread(internal)` - Create thread
- `updateThread(internal)` - Update thread
- `getThreads(query)` - Get threads
- `getThread(query)` - Get single thread

---

## React Components

### SummaryDashboard

**Location**: `apps/web/components/summarization/SummaryDashboard.tsx`

Display conversation summaries with all analysis.

**Props:**
```typescript
{
  conversationId: Id<"unified_conversations">
  orgId: string
}
```

**Features:**
- Generate summary button
- Provider selection (OpenAI/Anthropic)
- Short summary display
- Sentiment visualization
- Detailed summary
- Root cause
- Resolution steps
- Action items with checkboxes
- Tags
- Export to PDF
- Regenerate button

### EmailInbox

**Location**: `apps/web/components/email/EmailInbox.tsx`

Full-featured email client.

**Props:**
```typescript
{
  orgId: string
  emailAccountId?: Id<"email_accounts">
}
```

**Features:**
- Thread list
- Email composition
- Thread view
- Reply/Forward
- Template selection
- Attachment support
- Tracking info
- Star/Archive
- Read status

---

## Usage Examples

### Example 1: Generate Summary

```typescript
import { SummaryDashboard } from "@/components/summarization/SummaryDashboard";

function ConversationPage({ conversationId, orgId }) {
  return (
    <div>
      <h1>Conversation</h1>
      <SummaryDashboard
        conversationId={conversationId}
        orgId={orgId}
      />
    </div>
  );
}
```

### Example 2: Send Email

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function SendEmailButton() {
  const sendEmail = useAction(api.email.messages.sendEmail);

  const handleSend = async () => {
    await sendEmail({
      orgId: "org_123",
      emailAccountId: accountId,
      to: [{ email: "customer@example.com", name: "Customer" }],
      subject: "Re: Your Support Request",
      bodyHtml: "<p>Thank you for contacting us...</p>",
      bodyText: "Thank you for contacting us...",
    });
  };

  return <button onClick={handleSend}>Send Email</button>;
}
```

### Example 3: Use Email Template

```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function TemplateSelector() {
  const templates = useQuery(api.email.templates.getTemplates, {
    orgId: "org_123",
  });

  const renderedTemplate = useQuery(api.email.templates.renderTemplate, {
    templateId: selectedTemplateId,
    variables: {
      customerName: "John Doe",
      ticketNumber: "12345",
    },
  });

  return (
    <select>
      {templates?.map(t => (
        <option key={t._id} value={t._id}>{t.name}</option>
      ))}
    </select>
  );
}
```

### Example 4: Auto-Generate Summary on Close

```typescript
// In conversation close handler
const generateSummary = useAction(api.summarization.generator.generateSummary);

async function closeConversation() {
  // Close conversation
  await closeConv({ conversationId });
  
  // Auto-generate summary
  await generateSummary({
    orgId,
    conversationId,
    provider: "openai",
  });
}
```

---

## Configuration

### Environment Variables

```env
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Email Service (Resend)
RESEND_API_KEY=re_...

# App URL (for tracking pixels)
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Email Account Setup

**Gmail:**
```typescript
{
  provider: "gmail",
  imapHost: "imap.gmail.com",
  imapPort: 993,
  imapUseSsl: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUseSsl: true,
  // Use App Password, not regular password
}
```

**Outlook:**
```typescript
{
  provider: "outlook",
  imapHost: "outlook.office365.com",
  imapPort: 993,
  imapUseSsl: true,
  smtpHost: "smtp.office365.com",
  smtpPort: 587,
  smtpUseSsl: true,
}
```

**Custom IMAP:**
```typescript
{
  provider: "imap",
  imapHost: "mail.example.com",
  imapPort: 993,
  imapUseSsl: true,
  smtpHost: "mail.example.com",
  smtpPort: 587,
  smtpUseSsl: true,
}
```

### Template Variables

Variables use double curly braces: `{{variableName}}`

**Common Variables:**
- `{{customerName}}`
- `{{ticketNumber}}`
- `{{agentName}}`
- `{{companyName}}`
- `{{date}}`
- `{{time}}`

**Example Template:**
```html
Subject: Re: Ticket #{{ticketNumber}}

<p>Hello {{customerName}},</p>

<p>Thank you for contacting {{companyName}}. Your issue has been resolved.</p>

<p>Best regards,<br>
{{agentName}}</p>
```

---

## Cost Optimization

### Summarization Costs

**OpenAI GPT-4:**
- Input: $0.03 / 1K tokens
- Output: $0.06 / 1K tokens
- Average conversation: ~$0.10-0.50

**Anthropic Claude:**
- Input: $0.003 / 1K tokens
- Output: $0.015 / 1K tokens
- Average conversation: ~$0.01-0.05

**Optimization Tips:**
1. Use Claude for cost savings (10x cheaper)
2. Generate summaries on conversation close (not real-time)
3. Limit regeneration frequency
4. Use shorter context windows when possible
5. Cache summaries and mark outdated instead of regenerating

### Email Costs

**Resend Pricing:**
- Free tier: 100 emails/day
- Pro: $20/month for 50,000 emails
- Enterprise: Custom pricing

**Optimization Tips:**
1. Use templates to reduce composition time
2. Batch notifications
3. Implement auto-close to reduce back-and-forth
4. Use tracking pixels strategically (not every email)

---

## Best Practices

### Summarization

1. **Generate on Close**: Auto-generate when conversation is resolved
2. **Review Before Export**: Check summary before sharing with customer
3. **Update Action Items**: Keep action items current
4. **Version Control**: Keep old summaries for reference
5. **Cost Monitoring**: Track AI costs per summary

### Email

1. **Use Templates**: Create templates for common responses
2. **Professional Signatures**: Include contact info and branding
3. **Track Strategically**: Don't track every email (privacy)
4. **Spam Filter**: Enable spam filtering to reduce noise
5. **Thread Properly**: Maintain thread integrity for context
6. **Archive Old Threads**: Keep inbox clean
7. **Test IMAP/SMTP**: Verify configuration before going live

---

## Troubleshooting

### Summary Generation Issues

**Problem**: Summary generation fails

**Solutions:**
- Check API keys are configured
- Verify conversation has messages
- Check AI provider status
- Review error logs
- Try alternative provider

### Email Sending Issues

**Problem**: Emails not sending

**Solutions:**
- Verify SMTP configuration
- Check authentication credentials
- Test with simple email first
- Review Resend dashboard
- Check firewall/security settings

**Problem**: Emails going to spam

**Solutions:**
- Configure SPF/DKIM records
- Use professional from address
- Avoid spam trigger words
- Include unsubscribe link
- Warm up sender reputation

### Tracking Issues

**Problem**: Tracking pixels not working

**Solutions:**
- Verify app URL is correct
- Check pixel is inserted in HTML
- Test with different email clients
- Review delivery logs
- Some clients block tracking (expected)

---

## Future Enhancements

### Summarization
- [ ] Multi-language support
- [ ] Custom summary templates
- [ ] Sentiment trend charts
- [ ] Export to other formats (Word, Markdown)
- [ ] Scheduled auto-generation
- [ ] Summary comparison
- [ ] Customer-facing summaries

### Email
- [ ] OAuth integration (Gmail, Outlook)
- [ ] Advanced spam detection (ML-based)
- [ ] Email scheduling
- [ ] Send later
- [ ] Snooze emails
- [ ] Email rules/filters
- [ ] Auto-responder
- [ ] Email sequences
- [ ] A/B testing
- [ ] Email analytics dashboard

---

## License

Copyright © 2026. All rights reserved.
