// @ts-nocheck
/**
 * Email Service
 * React hooks and utilities for email management
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

/**
 * Account Hooks
 */

export function useEmailAccounts(orgId: string) {
  return useQuery(api.email.accounts.getAccounts, { orgId });
}

export function useCreateEmailAccount() {
  return useMutation(api.email.accounts.createAccount);
}

export function useUpdateEmailAccount() {
  return useMutation(api.email.accounts.updateAccount);
}

export function useDeleteEmailAccount() {
  return useMutation(api.email.accounts.deleteAccount);
}

/**
 * Message Hooks
 */

export function useEmailThread(threadId: string) {
  return useQuery(api.email.messages.getThread, { threadId });
}

export function useConversationEmails(conversationId: Id<"unified_conversations">) {
  return useQuery(api.email.messages.getConversationEmails, {
    conversationId,
  });
}

export function useSendEmail() {
  return useAction(api.email.messages.sendEmail);
}

export function useMarkEmailAsRead() {
  return useMutation(api.email.messages.markAsRead);
}

export function useToggleEmailStar() {
  return useMutation(api.email.messages.toggleStar);
}

/**
 * Template Hooks
 */

export function useEmailTemplates(params: {
  orgId: string;
  category?: string;
}) {
  return useQuery(api.email.templates.getTemplates, params);
}

export function useEmailTemplate(templateId: Id<"email_templates"> | undefined) {
  return useQuery(
    api.email.templates.getTemplate,
    templateId ? { templateId } : "skip"
  );
}

export function useRenderTemplate(params: {
  templateId: Id<"email_templates"> | undefined;
  variables?: any;
}) {
  return useQuery(
    api.email.templates.renderTemplate,
    params.templateId ? params : "skip"
  );
}

export function useCreateEmailTemplate() {
  return useMutation(api.email.templates.createTemplate);
}

export function useUpdateEmailTemplate() {
  return useMutation(api.email.templates.updateTemplate);
}

export function useDeleteEmailTemplate() {
  return useMutation(api.email.templates.deleteTemplate);
}

/**
 * Thread Hooks
 */

export function useEmailThreads(params: {
  orgId: string;
  limit?: number;
}) {
  return useQuery(api.email.threads.getThreads, params);
}

export function useEmailThreadById(threadId: string) {
  return useQuery(api.email.threads.getThread, { threadId });
}

/**
 * Utility Functions
 */

export const EmailUtils = {
  /**
   * Parse email address
   */
  parseEmail(emailString: string): { email: string; name?: string } {
    const match = emailString.match(/(?:"?([^"]*)"?\s)?(?:<?([^>]+)>?)/);
    if (match) {
      return {
        name: match[1]?.trim(),
        email: match[2]?.trim(),
      };
    }
    return { email: emailString.trim() };
  },

  /**
   * Format email address
   */
  formatEmail(email: { email: string; name?: string }): string {
    if (email.name) {
      return `"${email.name}" <${email.email}>`;
    }
    return email.email;
  },

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Extract email addresses from string
   */
  extractEmails(text: string): string[] {
    const regex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
    return text.match(regex) || [];
  },

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      received: "bg-blue-100 text-blue-800",
      sending: "bg-yellow-100 text-yellow-800",
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      bounced: "bg-red-100 text-red-800",
      spam: "bg-gray-100 text-gray-800",
    };
    return colors[status] || colors.received;
  },

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      received: "📥",
      sending: "⏳",
      sent: "✉️",
      failed: "❌",
      bounced: "↩️",
      spam: "🚫",
    };
    return icons[status] || "📧";
  },

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  /**
   * Get file type icon
   */
  getFileIcon(contentType: string): string {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.startsWith("video/")) return "🎥";
    if (contentType.startsWith("audio/")) return "🎵";
    if (contentType.includes("pdf")) return "📄";
    if (contentType.includes("word")) return "📝";
    if (contentType.includes("excel") || contentType.includes("sheet")) return "📊";
    if (contentType.includes("zip") || contentType.includes("archive")) return "📦";
    return "📎";
  },

  /**
   * Generate thread ID from message ID
   */
  generateThreadId(messageId: string): string {
    // Remove brackets and take first part before @
    return messageId.replace(/[<>]/g, "").split("@")[0];
  },

  /**
   * Strip HTML tags
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  },

  /**
   * Truncate text
   */
  truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  },

  /**
   * Get email preview
   */
  getEmailPreview(email: any): string {
    const text = email.bodyText || this.stripHtml(email.bodyHtml || "");
    return this.truncate(text, 150);
  },

  /**
   * Format recipients
   */
  formatRecipients(recipients: any[]): string {
    if (recipients.length === 0) return "";
    if (recipients.length === 1) {
      return recipients[0].name || recipients[0].email;
    }
    if (recipients.length === 2) {
      return `${recipients[0].name || recipients[0].email} and ${
        recipients[1].name || recipients[1].email
      }`;
    }
    return `${recipients[0].name || recipients[0].email} and ${
      recipients.length - 1
    } others`;
  },

  /**
   * Get relative time
   */
  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "just now";
    }
  },

  /**
   * Check if email is from today
   */
  isToday(timestamp: number): boolean {
    const today = new Date();
    const date = new Date(timestamp);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  },

  /**
   * Generate email signature
   */
  generateSignature(params: {
    name: string;
    title?: string;
    company?: string;
    phone?: string;
    email?: string;
    website?: string;
  }): string {
    let signature = `<br><br>--<br>`;
    signature += `<strong>${params.name}</strong><br>`;
    if (params.title) signature += `${params.title}<br>`;
    if (params.company) signature += `${params.company}<br>`;
    if (params.phone) signature += `📞 ${params.phone}<br>`;
    if (params.email) signature += `✉️ ${params.email}<br>`;
    if (params.website) {
      signature += `🌐 <a href="${params.website}">${params.website}</a><br>`;
    }
    return signature;
  },

  /**
   * Replace template variables
   */
  replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, value);
    }
    return result;
  },

  /**
   * Extract template variables
   */
  extractVariables(text: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  },

  /**
   * Generate tracking pixel URL
   */
  generateTrackingPixel(trackingId: string, baseUrl: string): string {
    return `<img src="${baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
  },

  /**
   * Generate unique message ID
   */
  generateMessageId(domain: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `<${timestamp}-${random}@${domain}>`;
  },

  /**
   * Parse References header
   */
  parseReferences(references: string): string[] {
    return references
      .split(/\s+/)
      .filter((ref) => ref.startsWith("<") && ref.endsWith(">"));
  },

  /**
   * Check if email is spam
   */
  isSpam(spamScore: number): boolean {
    return spamScore > 5.0;
  },

  /**
   * Get spam confidence
   */
  getSpamConfidence(spamScore: number): "low" | "medium" | "high" {
    if (spamScore < 3) return "low";
    if (spamScore < 6) return "medium";
    return "high";
  },

  /**
   * Export email to EML format
   */
  exportToEml(email: any): string {
    let eml = "";
    eml += `From: ${this.formatEmail(email.from)}\r\n`;
    eml += `To: ${email.to.map(this.formatEmail).join(", ")}\r\n`;
    if (email.cc) {
      eml += `Cc: ${email.cc.map(this.formatEmail).join(", ")}\r\n`;
    }
    eml += `Subject: ${email.subject}\r\n`;
    eml += `Date: ${new Date(email.receivedAt).toUTCString()}\r\n`;
    eml += `Message-ID: ${email.messageId}\r\n`;
    if (email.inReplyTo) {
      eml += `In-Reply-To: ${email.inReplyTo}\r\n`;
    }
    if (email.references) {
      eml += `References: ${email.references.join(" ")}\r\n`;
    }
    eml += `\r\n`;
    eml += email.bodyText || this.stripHtml(email.bodyHtml);
    return eml;
  },

  /**
   * Download email as file
   */
  downloadEmail(email: any, format: "eml" | "html" | "txt") {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "eml") {
      content = this.exportToEml(email);
      filename = `email-${email._id}.eml`;
      mimeType = "message/rfc822";
    } else if (format === "html") {
      content = email.bodyHtml || email.bodyText;
      filename = `email-${email._id}.html`;
      mimeType = "text/html";
    } else {
      content = email.bodyText || this.stripHtml(email.bodyHtml);
      filename = `email-${email._id}.txt`;
      mimeType = "text/plain";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/**
 * Type Guards
 */

export const EmailTypes = {
  isValidProvider(value: string): value is "gmail" | "outlook" | "imap" | "custom" {
    return ["gmail", "outlook", "imap", "custom"].includes(value);
  },

  isValidDirection(value: string): value is "inbound" | "outbound" {
    return ["inbound", "outbound"].includes(value);
  },

  isValidStatus(
    value: string
  ): value is "received" | "sending" | "sent" | "failed" | "bounced" | "spam" {
    return ["received", "sending", "sent", "failed", "bounced", "spam"].includes(value);
  },
};
