"use client";

/**
 * Email Inbox Component
 * Full-featured email client with threading, templates, and tracking
 */

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface EmailInboxProps {
  orgId: string;
  emailAccountId?: Id<"email_accounts">;
}

export function EmailInbox({ orgId, emailAccountId }: EmailInboxProps) {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Queries
  const accounts = useQuery(api.email.accounts.getAccounts, { orgId });
  const threads = useQuery(api.email.threads.getThreads, { orgId, limit: 50 });
  const templates = useQuery(api.email.templates.getTemplates, { orgId });

  const activeAccountId = emailAccountId || accounts?.[0]?._id;

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">📧</div>
        <h3 className="text-lg font-semibold mb-2">No Email Account Connected</h3>
        <p className="text-gray-600 mb-4">
          Connect an email account to start managing emails
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Connect Email Account
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Thread List */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <button
            onClick={() => setIsComposing(true)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ✉️ Compose
          </button>

          {/* Account Selector */}
          {accounts.length > 1 && (
            <select className="w-full mt-3 px-3 py-2 border rounded-lg">
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.email}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {!threads || threads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No emails</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread._id}
                thread={thread}
                isSelected={selectedThread === thread.threadId}
                onClick={() => setSelectedThread(thread.threadId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isComposing ? (
          <EmailComposer
            orgId={orgId}
            emailAccountId={activeAccountId!}
            templates={templates || []}
            onClose={() => setIsComposing(false)}
            onShowTemplates={() => setShowTemplates(true)}
          />
        ) : selectedThread ? (
          <ThreadView
            threadId={selectedThread}
            orgId={orgId}
            emailAccountId={activeAccountId!}
            onReply={() => {}}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📬</div>
              <p>Select an email to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Thread Item Component
function ThreadItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-l-4 border-blue-600" : ""
      } ${!thread.isRead ? "font-semibold" : ""}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium truncate flex-1">
          {thread.participants[0]?.name || thread.participants[0]?.email}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(thread.lastMessageAt).toLocaleDateString()}
        </div>
      </div>
      <div className="text-sm text-gray-900 mb-1 truncate">{thread.subject}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{thread.messageCount} messages</span>
        {thread.isStarred && <span className="text-yellow-500">⭐</span>}
      </div>
    </div>
  );
}

// Thread View Component
function ThreadView({
  threadId,
  orgId,
  emailAccountId,
  onReply,
}: {
  threadId: string;
  orgId: string;
  emailAccountId: Id<"email_accounts">;
  onReply: () => void;
}) {
  const emails = useQuery(api.email.messages.getThread, { threadId });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  if (!emails || emails.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  const latestEmail = emails[emails.length - 1];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <h2 className="text-xl font-semibold mb-2">{latestEmail.subject}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            From: {latestEmail.from.name || latestEmail.from.email}
          </span>
          <span>•</span>
          <span>
            To: {latestEmail.to.map((t) => t.email).join(", ")}
          </span>
          <span>•</span>
          <span>{new Date(latestEmail.receivedAt).toLocaleString()}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setReplyingTo(latestEmail.messageId)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reply
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Forward
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Archive
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {emails.map((email) => (
          <EmailMessage key={email._id} email={email} />
        ))}
      </div>

      {/* Reply Form */}
      {replyingTo && (
        <div className="border-t bg-white p-6">
          <EmailComposer
            orgId={orgId}
            emailAccountId={emailAccountId}
            inReplyTo={replyingTo}
            defaultTo={[latestEmail.from]}
            defaultSubject={`Re: ${latestEmail.subject}`}
            onClose={() => setReplyingTo(null)}
            compact
          />
        </div>
      )}
    </div>
  );
}

// Email Message Component
function EmailMessage({ email }: { email: any }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-semibold">{email.from.name || email.from.email}</div>
          <div className="text-sm text-gray-600">
            {new Date(email.receivedAt).toLocaleString()}
          </div>
        </div>
        {email.direction === "outbound" && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            Sent
          </span>
        )}
      </div>

      {/* Email Body */}
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: email.bodyHtml || email.bodyText }}
      />

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="font-medium text-sm mb-2">Attachments:</div>
          <div className="space-y-2">
            {email.attachments.map((attachment: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded"
              >
                <span className="text-2xl">📎</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{attachment.filename}</div>
                  <div className="text-xs text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:underline">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {email.openedAt && (
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          ✓ Opened {new Date(email.openedAt).toLocaleString()}
          {email.openCount && email.openCount > 1 && ` (${email.openCount} times)`}
        </div>
      )}
    </div>
  );
}

// Email Composer Component
function EmailComposer({
  orgId,
  emailAccountId,
  templates,
  inReplyTo,
  defaultTo,
  defaultSubject,
  onClose,
  onShowTemplates,
  compact,
}: {
  orgId: string;
  emailAccountId: Id<"email_accounts">;
  templates?: any[];
  inReplyTo?: string;
  defaultTo?: any[];
  defaultSubject?: string;
  onClose: () => void;
  onShowTemplates?: () => void;
  compact?: boolean;
}) {
  const [to, setTo] = useState(defaultTo?.map((t) => t.email).join(", ") || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendEmail = useAction(api.email.messages.sendEmail);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    try {
      await sendEmail({
        orgId,
        emailAccountId,
        to: to.split(",").map((email) => ({ email: email.trim() })),
        cc: cc ? cc.split(",").map((email) => ({ email: email.trim() })) : undefined,
        subject,
        bodyHtml: body.replace(/\n/g, "<br>"),
        bodyText: body,
        inReplyTo,
      });

      onClose();
      alert("Email sent successfully!");
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={compact ? "" : "flex-1 flex flex-col p-6 bg-white"}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {inReplyTo ? "Reply" : "New Email"}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 flex-1">
        <input
          type="text"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Cc (optional)"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg h-64"
        />

        {templates && templates.length > 0 && (
          <div>
            <button
              onClick={onShowTemplates}
              className="text-sm text-blue-600 hover:underline"
            >
              📋 Use Template
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
