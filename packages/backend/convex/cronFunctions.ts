// @ts-nocheck
import { internalMutation, internalQuery } from './_generated/server';

export const cleanupOldData = internalMutation(async (ctx) => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Cleanup old widget sessions
  const oldSessions = await ctx.db
    .query('widget_sessions')
    .filter((q) => q.lt(q.field('lastActiveAt'), thirtyDaysAgo))
    .collect();

  for (const session of oldSessions) {
    await ctx.db.delete(session._id);
  }

  // Cleanup old voice messages beyond retention period
  const oldVoiceMessages = await ctx.db
    .query('voice_messages')
    .filter((q) => q.lt(q.field('timestampMs'), thirtyDaysAgo))
    .collect();

  for (const msg of oldVoiceMessages) {
    await ctx.db.delete(msg._id);
  }

  console.log(`Cleaned up ${oldSessions.length} sessions and ${oldVoiceMessages.length} voice messages`);
});

export const performBackup = internalMutation(async (ctx) => {
  // In production, you'd use AWS S3 or similar to export data
  console.log('Performing weekly backup');

  // Example: Log a backup event
  await ctx.db.insert('audit_logs', {
    orgId: 'system',
    userId: 'system',
    action: 'backup_started',
    details: 'Weekly automated backup',
    timestamp: Date.now(),
  });
});

export const generateMonthlyReports = internalMutation(async (ctx) => {
  console.log('Generating monthly reports');

  // In production, you'd generate PDF reports and send them via email
  await ctx.db.insert('audit_logs', {
    orgId: 'system',
    userId: 'system',
    action: 'reports_generated',
    details: 'Monthly reports generated',
    timestamp: Date.now(),
  });
});

export const checkSubscriptionTrials = internalMutation(async (ctx) => {
  console.log('Checking subscription trials');

  const now = Date.now();
  const subscriptions = await ctx.db.query('subscriptions').collect();

  for (const sub of subscriptions) {
    if (sub.trialEndsAt && sub.trialEndsAt <= now && sub.status === 'trialing') {
      await ctx.db.patch(sub._id, {
        status: 'active',
      });
      console.log(`Trial ended for subscription ${sub._id}`);
    }

    // Check for grace period
    if (sub.gracePeriodEndsAt && sub.gracePeriodEndsAt <= now && sub.status === 'past_due') {
      await ctx.db.patch(sub._id, {
        status: 'unpaid',
      });
      console.log(`Grace period ended for subscription ${sub._id}`);
    }
  }
});
