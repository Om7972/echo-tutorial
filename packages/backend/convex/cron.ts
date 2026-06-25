// @ts-nocheck
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Daily cleanup job (runs at 2 AM UTC)
crons.daily('daily-cleanup', { hourUTC: 2, minuteUTC: 0 }, internal.cronFunctions.cleanupOldData);

// Weekly backups (runs at 3 AM UTC on Sundays)
crons.weekly('weekly-backup', { dayOfWeek: 'sunday', hourUTC: 3, minuteUTC: 0 }, internal.cronFunctions.performBackup);

// Monthly reports (runs at 4 AM UTC on 1st of month)
crons.monthly('monthly-reports', { day: 1, hourUTC: 4, minuteUTC: 0 }, internal.cronFunctions.generateMonthlyReports);

// Check subscriptions for expiring trials (every hour)
crons.hourly('check-subscriptions', { minuteUTC: 0 }, internal.cronFunctions.checkSubscriptionTrials);

export default crons;
