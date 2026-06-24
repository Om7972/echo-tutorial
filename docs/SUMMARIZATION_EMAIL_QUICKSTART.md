# Summarization & Email - Quick Start Guide

Get started with AI-powered summarization and email support in 5 minutes.

## Table of Contents

1. [Automatic Summarization](#automatic-summarization)
2. [Email Support](#email-support)
3. [Configuration](#configuration)
4. [Common Patterns](#common-patterns)

---

## Automatic Summarization

### 1. Display Summary Widget

```typescript
import { SummaryDashboard } from "@/components/summarization/SummaryDashboard";

function ConversationPage({ conversationId, orgId }) {
  return (
    <div>
      <h1>Conversation Details</h1>
      
      {/* Summary Widget */}
      <SummaryDashboard
        conversationId={conversationId}
        orgId={orgId}
      />
    </div>
  );
}
```

### 2. Generate Summary Programmatically

```typescript
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function GenerateSummaryButton({ conversationId, orgId }) {
  const generateSummary = useAction(api.summarization.generator.generateSummary);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateSummary({
        orgId,
        conversationId,
        provider: "openai", // or "anthropic"
      });
      
      console.log("Summary generated:", result);
      alert("Summary generated successfully!");
    } catch (error) {
      console.error("Failed:", error);
      alert("Failed to generate summary");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {isGenerating ? "Generating..." : "Generate Summary"}
    </button>
  );
}
```

### 3. Use Summary Hooks

```typescript
import { useSummary, useCompleteActionItem } from "@/lib/summarization/SummarizationService";

function SummaryViewer({ conversationId }) {
  const summary = useSummary(conversationId);
  const completeActionItem = useCompleteActionItem();

  if (!summary) {
    return <div>No summary available</div>;
  }

  const handleCompleteAction = async (index: number) => {
    await completeActionItem({
      summaryId: summary._id,
      actionItemIndex: index,
    });
  };

  return (
    <div>
      <h2>{summary.shortSummary}</h2>
      <p>Sentiment: {summary.sentiment}</p>
      
      {/* Action Items */}
      <ul>
        {summary.actionItems.map((item, index) => (
          <li key={index}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleCompleteAction(index)}
            />
            {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. Auto-Generate on Conversation Close

```typescript
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

function CloseConversationButton({ conversationId, orgId }) {
  const closeConversation = useMutation(api.conversations.close);
  const generateSummary = useAction(api.summarization.generator.generateSummary);

  const handleClose = async () => {
    // Close conversation
    await closeConversation({ conversationId });
    
    // Auto-generate summary
    await generateSummary({
      orgId,
      conversationId,
      provider: "anthropic", // Cheaper option
    });
  };

  return (
    <button onClick={handleClose}>
      Close & Summarize
    </button>
  );
}
```

### 5. Export Summary

```typescript
import { SummarizationUtils } from "@/lib/summarization/SummarizationService";

function ExportSummaryButton({ summary }) {
  const handleExport = (format: "markdown" | "json" | "txt") => {
    SummarizationUtils.downloadSummary(summary, format);
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => handleExport("markdown")}>
        Export Markdown
      </button>
      <button onClick={() => handleExport("json")}>
        Export JSON
      </button>
      <button onClick={() => handleExport("txt")}>
        Export Text
      </button>
    </div>
  );
}
```

---

## Email Support

### 1. Display Email Inbox

```typescript
import { EmailInbox } from "@/components/email/EmailInbox";

function EmailPage({ orgId }) {
  return (
    <div className="h-screen">
      <EmailInbox orgId={orgId} />
    </div>
  );
}
```

### 2. Send Email

```typescript
import { useSendEmail } from "@/lib/email/EmailService";

function SendEmailButton({ emailAccountId, orgId }) {
  const sendEmail = useSendEmail();

  const handleSend = async () => {
    try {
      await sendEmail({
        orgId,
        emailAccountId,
        to: [{ email: "customer@example.com", name: "Customer Name" }],
        subject: "Re: Your Support Request",
        bodyHtml: "<p>Thank you for contacting us...</p>",
        bodyText: "Thank you for contacting us...",
      });
      
      alert("Email sent!");
    } catch (error) {
      console.error("Failed to send:", error);
      alert("Failed to send email");
    }
  };

  return (
    <button onClick={handleSend}>
      Send Email
    </button>
  );
}
```

### 3. Use Email Template

```typescript
import {
  useEmailTemplates,
  useRenderTemplate,
  useSendEmail,
} from "@/lib/email/EmailService";

function TemplateEmailComposer({ orgId, emailAccountId }) {
  const templates = useEmailTemplates({ orgId });
  const [selectedTemplate, setSelectedTemplate] = useState<string>();
  
  const rendered = useRenderTemplate({
    templateId: selectedTemplate as any,
    variables: {
      customerName: "John Doe",
      ticketNumber: "12345",
      agentName: "Jane Smith",
    },
  });
  
  const sendEmail = useSendEmail();

  const handleSendWithTemplate = async () => {
    if (!rendered) return;
    
    await sendEmail({
      orgId,
      emailAccountId,
      to: [{ email: "customer@example.com" }],
      subject: rendered.subject,
      bodyHtml: rendered.bodyHtml,
      bodyText: rendered.bodyText,
    });
  };

  return (
    <div>
      <select onChange={(e) => setSelectedTemplate(e.target.value)}>
        <option value="">Select template...</option>
        {templates?.map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
      </select>
      
      {rendered && (
        <div>
          <h3>{rendered.subject}</h3>
          <div dangerouslySetInnerHTML={{ __html: rendered.bodyHtml }} />
          <button onClick={handleSendWithTemplate}>Send</button>
        </div>
      )}
    </div>
  );
}
```

### 4. Create Email Account

```typescript
import { useCreateEmailAccount } from "@/lib/email/EmailService";

function AddEmailAccountForm({ orgId }) {
  const createAccount = useCreateEmailAccount();
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    provider: "gmail" as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAccount({
        orgId,
        email: formData.email,
        displayName: formData.displayName,
        provider: formData.provider,
        // Gmail configuration
        imapHost: "imap.gmail.com",
        imapPort: 993,
        imapUsername: formData.email,
        imapPassword: "your-app-password", // Use App Password
        imapUseSsl: true,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUsername: formData.email,
        smtpPassword: "your-app-password",
        smtpUseSsl: true,
        enableSpamFilter: true,
        enableTrackingPixels: true,
      });
      
      alert("Email account added!");
    } catch (error) {
      console.error("Failed:", error);
      alert("Failed to add email account");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email address"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="text"
        placeholder="Display name"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />
      <button type="submit">Add Account</button>
    </form>
  );
}
```

### 5. Reply to Email

```typescript
import { useSendEmail, useEmailThread } from "@/lib/email/EmailService";

function ReplyToEmail({ threadId, emailAccountId, orgId }) {
  const thread = useEmailThread(threadId);
  const sendEmail = useSendEmail();
  const [replyBody, setReplyBody] = useState("");

  const handleReply = async () => {
    if (!thread || thread.length === 0) return;
    
    const latestEmail = thread[thread.length - 1];
    
    await sendEmail({
      orgId,
      emailAccountId,
      to: [latestEmail.from],
      subject: `Re: ${latestEmail.subject}`,
      bodyHtml: `<p>${replyBody}</p>`,
      bodyText: replyBody,
      inReplyTo: latestEmail.messageId,
      references: [
        ...(latestEmail.references || []),
        latestEmail.messageId,
      ],
      conversationId: latestEmail.conversationId,
    });
    
    setReplyBody("");
    alert("Reply sent!");
  };

  return (
    <div>
      <textarea
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
        placeholder="Type your reply..."
      />
      <button onClick={handleReply}>Send Reply</button>
    </div>
  );
}
```

---

## Configuration

### Environment Variables

Create or update `.env.local`:

```env
# AI Providers (for summarization)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Email Service (Resend)
RESEND_API_KEY=re_...

# App URL (for tracking pixels)
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Email Provider Presets

#### Gmail

```typescript
const gmailConfig = {
  provider: "gmail",
  imapHost: "imap.gmail.com",
  imapPort: 993,
  imapUseSsl: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUseSsl: true,
};
```

#### Outlook

```typescript
const outlookConfig = {
  provider: "outlook",
  imapHost: "outlook.office365.com",
  imapPort: 993,
  imapUseSsl: true,
  smtpHost: "smtp.office365.com",
  smtpPort: 587,
  smtpUseSsl: true,
};
```

---

## Common Patterns

### Pattern 1: Summary Widget in Conversation View

```typescript
import { SummaryDashboard } from "@/components/summarization/SummaryDashboard";

function ConversationView({ conversationId, orgId }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Main conversation */}
      <div className="col-span-2">
        <Messages conversationId={conversationId} />
      </div>
      
      {/* Summary sidebar */}
      <div className="col-span-1">
        <SummaryDashboard
          conversationId={conversationId}
          orgId={orgId}
        />
      </div>
    </div>
  );
}
```

### Pattern 2: Email Integration in Unified Inbox

```typescript
import { EmailInbox } from "@/components/email/EmailInbox";
import { UnifiedInbox } from "@/components/inbox/UnifiedInbox";

function InboxPage({ orgId }) {
  const [view, setView] = useState<"unified" | "email">("unified");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("unified")}>
          Unified Inbox
        </button>
        <button onClick={() => setView("email")}>
          Email Only
        </button>
      </div>
      
      {view === "unified" ? (
        <UnifiedInbox orgId={orgId} />
      ) : (
        <EmailInbox orgId={orgId} />
      )}
    </div>
  );
}
```

### Pattern 3: Auto-Summary on Resolution

```typescript
// Hook into conversation resolution workflow
import { useAction, useMutation } from "convex/react";

function useResolveConversation() {
  const resolveConv = useMutation(api.conversations.resolve);
  const generateSummary = useAction(api.summarization.generator.generateSummary);

  return async (conversationId: string, orgId: string) => {
    // Resolve conversation
    await resolveConv({ conversationId });
    
    // Generate summary in background
    generateSummary({
      orgId,
      conversationId,
      provider: "anthropic", // Cost-effective
    }).catch(err => {
      console.error("Summary generation failed:", err);
      // Don't block resolution if summary fails
    });
  };
}
```

### Pattern 4: Email Template Management

```typescript
import {
  useEmailTemplates,
  useCreateEmailTemplate,
} from "@/lib/email/EmailService";

function TemplateManager({ orgId }) {
  const templates = useEmailTemplates({ orgId });
  const createTemplate = useCreateEmailTemplate();

  const handleCreate = async () => {
    await createTemplate({
      orgId,
      name: "Welcome Email",
      subject: "Welcome to {{companyName}}",
      bodyHtml: `
        <p>Hello {{customerName}},</p>
        <p>Welcome to our service!</p>
        <p>Best regards,<br>{{agentName}}</p>
      `,
      category: "onboarding",
      variables: [
        { name: "customerName", description: "Customer's name" },
        { name: "companyName", description: "Your company name" },
        { name: "agentName", description: "Agent's name" },
      ],
    });
  };

  return (
    <div>
      <button onClick={handleCreate}>Create Template</button>
      
      <div className="mt-4">
        {templates?.map((template) => (
          <div key={template._id} className="p-4 border rounded">
            <h3>{template.name}</h3>
            <p>Used {template.usageCount} times</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 5: Utility Functions

```typescript
import { SummarizationUtils } from "@/lib/summarization/SummarizationService";
import { EmailUtils } from "@/lib/email/EmailService";

// Estimate cost before generating
const estimatedCost = SummarizationUtils.estimateCost(50, "openai");
console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);

// Format email addresses
const formatted = EmailUtils.formatEmail({
  email: "john@example.com",
  name: "John Doe",
});
console.log(formatted); // "John Doe" <john@example.com>

// Validate email
const isValid = EmailUtils.isValidEmail("test@example.com");

// Get relative time
const timeAgo = EmailUtils.getRelativeTime(Date.now() - 3600000);
console.log(timeAgo); // "1 hour ago"

// Extract variables from template
const variables = EmailUtils.extractVariables(
  "Hello {{name}}, your order {{orderId}} is ready!"
);
console.log(variables); // ["name", "orderId"]
```

---

## Next Steps

1. **Read Full Documentation**: [SUMMARIZATION_AND_EMAIL.md](./SUMMARIZATION_AND_EMAIL.md)
2. **Configure Environment**: Set up API keys and services
3. **Test Features**: Start with simple examples
4. **Customize**: Adapt components to your needs
5. **Monitor Costs**: Track AI and email usage

## Troubleshooting

### Summary Not Generating

- Check API keys are set
- Verify conversation has messages
- Try alternative provider
- Check browser console for errors

### Email Not Sending

- Verify SMTP configuration
- Check Resend API key
- Test with simple email first
- Review delivery logs

### Templates Not Working

- Check variable syntax: `{{variableName}}`
- Verify template exists
- Test rendering before sending
- Check for typos in variable names

---

## Support

For questions or issues:
1. Check this quick start guide
2. Review full documentation
3. Test with simple examples
4. Check implementation status document

## License

Copyright © 2026. All rights reserved.
