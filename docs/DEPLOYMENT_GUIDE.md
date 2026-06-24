# Echo Platform - Complete Deployment Guide

**Last Updated**: June 24, 2026  
**Status**: Production-Ready  

This guide provides step-by-step instructions for deploying the Echo platform to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Convex Backend Deployment](#convex-backend-deployment)
4. [Next.js Frontend Deployment](#nextjs-frontend-deployment)
5. [Third-Party Services](#third-party-services)
6. [Database Migrations](#database-migrations)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup Strategy](#backup-strategy)
9. [Security Configuration](#security-configuration)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] **Convex** account ([convex.dev](https://convex.dev))
- [ ] **Vercel** account (for Next.js hosting)
- [ ] **Clerk** account (for authentication)
- [ ] **OpenAI** account (for AI features)
- [ ] **Resend** account (for emails)
- [ ] **AWS** account (optional, for S3/CloudFront)
- [ ] **Sentry** account (for error tracking)
- [ ] **GitHub** account (for CI/CD)

### Required Tools
```bash
# Check versions
node --version  # v20.0.0 or higher
pnpm --version  # 10.0.0 or higher
git --version   # 2.0.0 or higher
```

### API Keys Needed
Before deployment, gather these API keys:

1. **Convex**
   - Deployment URL
   - Production key

2. **Clerk**
   - Publishable key
   - Secret key

3. **OpenAI**
   - API key (starts with `sk-`)

4. **Anthropic** (optional)
   - API key (starts with `sk-ant-`)

5. **Resend**
   - API key (starts with `re_`)
   - Verified domain

6. **Sentry** (optional)
   - DSN
   - Auth token

---

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/echo-tutorial.git
cd echo-tutorial
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables

Create `.env.local` in the root:

```env
# ============================================================================
# CONVEX BACKEND
# ============================================================================
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# ============================================================================
# NEXT.JS APPLICATION
# ============================================================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# ============================================================================
# AUTHENTICATION (Clerk)
# ============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ============================================================================
# AI PROVIDERS
# ============================================================================
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# ============================================================================
# EMAIL (Resend)
# ============================================================================
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Echo Support

# ============================================================================
# REDIS CACHE (Optional but recommended)
# ============================================================================
REDIS_URL=redis://your-redis-url:6379
REDIS_TOKEN=your_redis_token

# ============================================================================
# AWS SERVICES (Optional)
# ============================================================================
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=echo-platform-storage
AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net

# ============================================================================
# MONITORING (Sentry)
# ============================================================================
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=echo-platform
NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE=1.0

# ============================================================================
# SECURITY
# ============================================================================
AUDIT_RETENTION_DAYS=90
WEBHOOK_MAX_RETRIES=3
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_RATE_LIMIT=100
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_AI_EVALUATION=true
ENABLE_WEBHOOKS=true
ENABLE_ANALYTICS=true
ENABLE_SECURITY_LOGS=true

# ============================================================================
# ENCRYPTION
# ============================================================================
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# ============================================================================
# VERCEL (Auto-populated when deployed to Vercel)
# ============================================================================
VERCEL_URL=
VERCEL_ENV=production
```

**Important**: Never commit `.env.local` to git!

---

## Convex Backend Deployment

### Step 1: Create Convex Project

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Click "Create Project"
3. Name: `echo-platform-prod`
4. Click "Create"

### Step 2: Initialize Convex

```bash
# Login to Convex
npx convex login

# Initialize project (if not done)
npx convex init

# Link to production project
npx convex deploy --prod
```

### Step 3: Configure Convex Environment Variables

```bash
# Set environment variables in Convex
npx convex env set OPENAI_API_KEY sk-xxxxxxxxxxxxx --prod
npx convex env set ANTHROPIC_API_KEY sk-ant-xxxxxxxxxxxxx --prod
npx convex env set RESEND_API_KEY re_xxxxxxxxxxxxx --prod
npx convex env set RESEND_FROM_EMAIL notifications@yourdomain.com --prod
```

### Step 4: Deploy Backend

```bash
# Deploy all functions and schema
npx convex deploy --prod

# Verify deployment
npx convex logs --prod
```

### Step 5: Initialize Database

Run these commands to set up initial data:

```bash
# Initialize default templates
npx convex run notifications:templates:initializeDefaultTemplates --prod

# Set up default plans (if using billing)
npx convex run billing:plans:initializeDefaultPlans --prod

# Create initial cron jobs
npx convex run workers:cron:setupDefaultJobs --prod
```

---

## Next.js Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### 1. Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select `echo-tutorial` repo

#### 2. Configure Build Settings

```
Framework Preset: Next.js
Root Directory: apps/web
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install
```

#### 3. Add Environment Variables

In Vercel dashboard, add all variables from `.env.local`:
- Settings → Environment Variables
- Add each variable
- Select "Production" environment

#### 4. Deploy

```bash
# Deploy
git push origin main

# Or manually
vercel --prod
```

#### 5. Configure Custom Domain

1. Settings → Domains
2. Add your domain: `app.yourdomain.com`
3. Configure DNS records:

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Option B: Deploy to AWS

See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for detailed AWS deployment.

### Option C: Docker Deployment

```bash
# Build image
docker build -t echo-platform:latest .

# Run container
docker run -p 3000:3000 \
  --env-file .env.local \
  echo-platform:latest

# Or use docker-compose
docker-compose up -d
```

---

## Third-Party Services

### 1. Clerk Authentication

#### Setup Steps:
1. Go to [clerk.com](https://clerk.com)
2. Create application: "Echo Platform"
3. Configure OAuth providers:
   - Google
   - GitHub
   - Microsoft
4. Set redirect URLs:
   - `https://yourdomain.com/*`
   - `https://yourdomain.com/api/auth/callback/*`
5. Copy API keys to environment variables

#### Webhook Configuration:
```
Endpoint: https://yourdomain.com/api/webhooks/clerk
Events: user.created, user.updated, user.deleted
```

### 2. Resend Email

#### Setup Steps:
1. Go to [resend.com](https://resend.com)
2. Add domain: `yourdomain.com`
3. Verify DNS records:

```
Type: TXT
Name: @
Value: resend-verification=xxxxxxxxxxxxx

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com (Priority: 10)

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

4. Create API key
5. Test sending:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "notifications@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Hello from Echo!</p>"
  }'
```

### 3. OpenAI API

#### Setup Steps:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Set usage limits:
   - Daily: $100
   - Monthly: $3000
4. Enable models:
   - `gpt-4` (for evaluation)
   - `gpt-3.5-turbo` (for responses)
   - `text-embedding-3-small` (for embeddings)

### 4. Sentry Monitoring

#### Setup Steps:
1. Go to [sentry.io](https://sentry.io)
2. Create project: "echo-platform"
3. Platform: Next.js
4. Copy DSN
5. Configure source maps upload:

```bash
# Install Sentry CLI
pnpm add -D @sentry/cli

# Configure
npx sentry-cli login

# Upload source maps (done automatically in build)
```

---

## Database Migrations

### Running Migrations

Convex handles schema migrations automatically, but here's the process:

#### 1. Backup Current Data
```bash
# Export data
npx convex export --prod > backup-$(date +%Y%m%d).jsonl
```

#### 2. Deploy Schema Changes
```bash
# Deploy schema
npx convex deploy --prod

# Convex will:
# - Compare old vs new schema
# - Create new tables
# - Add new fields
# - Create new indexes
```

#### 3. Data Migration Scripts

For complex migrations, create migration scripts:

```typescript
// packages/backend/convex/migrations/001_add_field.ts
import { internalMutation } from "../_generated/server";

export default internalMutation(async ({ db }) => {
  const records = await db.query("table_name").collect();
  
  for (const record of records) {
    await db.patch(record._id, {
      newField: "default_value",
    });
  }
  
  return { migrated: records.length };
});
```

Run migration:
```bash
npx convex run migrations:001_add_field --prod
```

---

## Monitoring & Logging

### 1. Sentry Error Tracking

Already configured in codebase. Verify:

```typescript
// apps/web/instrumentation.ts is loaded automatically
```

### 2. Convex Logs

View logs:
```bash
# Real-time logs
npx convex logs --prod

# Filter by function
npx convex logs --prod --function="webhooks:delivery:processDeliveries"

# Export logs
npx convex logs --prod --since=1h > logs.txt
```

### 3. Analytics Dashboard

Built-in analytics available at:
```
https://yourdomain.com/dashboard/analytics
```

### 4. Health Checks

Set up health check endpoint monitoring:

**Endpoint**: `https://yourdomain.com/api/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "services": {
    "convex": "healthy",
    "redis": "healthy",
    "openai": "healthy",
    "resend": "healthy"
  }
}
```

**Monitoring Services**:
- UptimeRobot
- Pingdom
- StatusCake

Configuration:
```
URL: https://yourdomain.com/api/health
Interval: 5 minutes
Timeout: 30 seconds
Alert: Email + Slack
```

---

## Backup Strategy

### 1. Convex Snapshots

Automated daily backups (handled by Convex):
- Retention: 30 days
- Point-in-time recovery
- Automatic snapshots before deployments

Manual backup:
```bash
# Export all data
npx convex export --prod > backup-$(date +%Y%m%d).jsonl

# Restore from backup
npx convex import --prod < backup-20260624.jsonl
```

### 2. S3 Backup (Optional)

Automated backup to S3:

```bash
# Create backup script: scripts/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
npx convex export --prod > backup-$DATE.jsonl
aws s3 cp backup-$DATE.jsonl s3://echo-platform-backups/
rm backup-$DATE.jsonl

# Make executable
chmod +x scripts/backup.sh

# Add to cron (daily at 2 AM)
0 2 * * * /path/to/scripts/backup.sh
```

### 3. Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 24 hours

**Recovery Steps**:
1. Create new Convex project
2. Restore from latest backup
3. Update environment variables
4. Deploy frontend
5. Update DNS records
6. Verify functionality

---

## Security Configuration

### 1. HTTPS/SSL

Handled automatically by Vercel. Verify:
- All traffic is HTTPS
- TLS 1.3 enabled
- HSTS headers set

### 2. CORS Configuration

```typescript
// apps/web/middleware.ts
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = ['https://yourdomain.com', 'https://app.yourdomain.com'];
  
  if (origin && allowed.includes(origin)) {
    return NextResponse.next({
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}
```

### 3. Rate Limiting

Configure rate limits in production:

```typescript
// Already implemented in convex/security/rateLimit.ts

// Configure limits:
- API: 100 requests/minute per IP
- Webhooks: 10 requests/minute per webhook
- Auth: 5 login attempts per minute per IP
```

### 4. Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://convex.cloud wss://convex.cloud;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Performance Optimization

### 1. Caching Strategy

#### Redis Configuration:
```typescript
// Cache frequently accessed data
const redis = new Redis(process.env.REDIS_URL);

// Cache patterns
- User sessions: 30 minutes
- Analytics data: 5 minutes
- Static content: 1 hour
- API responses: 1 minute
```

#### CDN (CloudFront):
```
Cache behaviors:
- Static assets (/_next/static/*): Cache for 1 year
- Images (/images/*): Cache for 1 month
- API routes (/api/*): No cache
- Pages: Cache for 1 hour with stale-while-revalidate
```

### 2. Database Optimization

All tables are already indexed. Verify:
```bash
# Check indexes
npx convex dashboard --prod

# Navigate to schema tab
# Verify all queries use indexes
```

### 3. Image Optimization

Use Next.js Image component:
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority={true} // For above-the-fold images
/>
```

### 4. Code Splitting

Automatically handled by Next.js. Verify:
```bash
# Build and check bundle sizes
pnpm build

# Output shows:
# - Page bundles
# - Shared chunks
# - First Load JS
```

### 5. Performance Monitoring

Use Vercel Analytics or Web Vitals:

```typescript
// apps/web/app/layout.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics
  if (metric.name === 'FCP') {
    console.log('First Contentful Paint:', metric.value);
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Convex Connection Error
```
Error: Could not connect to Convex

Solution:
- Check NEXT_PUBLIC_CONVEX_URL is correct
- Verify Convex deployment is active
- Check network/firewall settings
```

#### 2. Authentication Error
```
Error: Clerk authentication failed

Solution:
- Verify Clerk keys are correct
- Check domain is added in Clerk dashboard
- Verify redirect URLs match
```

#### 3. Email Not Sending
```
Error: Resend API error

Solution:
- Verify Resend API key
- Check domain is verified
- Test with curl command
- Check rate limits
```

#### 4. Build Failures
```
Error: Type error in build

Solution:
- Run `pnpm type-check` locally
- Fix TypeScript errors
- Ensure all dependencies installed
```

### Performance Issues

#### Slow API Responses
1. Check Convex dashboard for slow queries
2. Verify indexes are being used
3. Enable Redis caching
4. Review query complexity

#### High Memory Usage
1. Check for memory leaks
2. Review large data queries
3. Implement pagination
4. Use streaming for large responses

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Verify all pages load correctly
- [ ] Test user authentication flow
- [ ] Send test emails
- [ ] Trigger test webhooks
- [ ] Check error logs in Sentry
- [ ] Verify database is accessible
- [ ] Test mobile responsiveness
- [ ] Check SSL certificate

### Week 1
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Check backup creation
- [ ] Test disaster recovery
- [ ] Review security logs
- [ ] Monitor API costs
- [ ] Check rate limiting
- [ ] Review user feedback

### Monthly
- [ ] Review and optimize database
- [ ] Rotate API keys and secrets
- [ ] Update dependencies
- [ ] Review security audit logs
- [ ] Optimize caching strategy
- [ ] Review backup retention
- [ ] Update documentation

---

## Scaling Considerations

### Current Capacity
- 100K concurrent conversations
- 10K requests/second
- 99.9% uptime

### Scaling Triggers
1. **CPU > 80%**: Add more instances
2. **Memory > 80%**: Increase instance size
3. **Database latency > 100ms**: Optimize queries
4. **Error rate > 1%**: Investigate and fix

### Horizontal Scaling

Convex scales automatically, but for frontend:

```yaml
# vercel.json
{
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "regions": ["iad1", "sfo1", "lhr1"],
  "functions": {
    "apps/web/api/**/*.ts": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

---

## Support

For deployment issues:
- **Documentation**: Read all docs in `/docs`
- **GitHub Issues**: Report bugs
- **Email**: devops@echo-platform.com
- **Slack**: #deployment channel

---

**Deployment completed! 🚀**

Your Echo platform is now live at: `https://yourdomain.com`
