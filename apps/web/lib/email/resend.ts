import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const response = await resend.emails.send({
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    } as any);

    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Predefined email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to Echo!',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thanks for joining Echo. We're excited to have you on board.</p>
    `,
  }),
  passwordReset: (resetUrl: string) => ({
    subject: 'Reset your password',
    html: `
      <h1>Reset your password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  }),
  invoicePaid: (invoiceId: string, amount: string) => ({
    subject: `Invoice #${invoiceId} Paid`,
    html: `
      <h1>Invoice Paid</h1>
      <p>Your invoice #${invoiceId} has been paid successfully for ${amount}.</p>
    `,
  }),
};
