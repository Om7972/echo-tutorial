# Memory System Deployment Checklist

## 📋 Pre-Deployment

### 1. Environment Variables
- [ ] Add `OPENAI_API_KEY` to `.env.local` (development)
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local` (optional)
- [ ] Add `OPENAI_API_KEY` to Vercel/production environment
- [ ] Add `ANTHROPIC_API_KEY` to Vercel/production environment (optional)
- [ ] Verify `NEXT_PUBLIC_CONVEX_URL` is set
- [ ] Verify `CONVEX_DEPLOYMENT` is set

### 2. API Keys Validation
```bash
# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### 3. Dependencies Check
```bash
cd packages/backend
pnpm list | grep convex    # Should show ^1.25.4
pnpm list | grep openai    # Should show ^4.0.0
pnpm list | grep anthropic # Should show ^0.20.0
```

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Convex)

```bash
cd packages/backend

# Start Convex dev (this deploys schema)
pnpm run dev

# Verify deployment
# Check Convex dashboard: https://dashboard.convex.dev
```

**Verify:**
- [ ] All 8 new tables appear in Convex dashboard
- [ ] No schema errors in console
- [ ] Cron jobs are scheduled

### Step 2: Test Memory Functions

```bash
# In Convex dashboard, test these functions:
```

**Test 1: Create Memory**
```json
// api.memory.manager.createShortTermMemory
{
  "conversationId": "test_conversation_id",
  "orgId": "test_org",
  "messageIds": [],
  "content": "This is a test memory",
  "tokenCount": 5
}
```

**Test 2: Get Memories**
```json
// api.memory.manager.getConversationMemories
{
  "conversationId": "test_conversation_id",
  "limit": 10
}
```

**Test 3: Get Stats**
```json
// api.memory.manager.getMemoryStats
{
  "orgId": "test_org"
}
```

### Step 3: Test Summarization

```bash
# Test OpenAI connection
```

```json
// api.memory.summarizer.summarizeConversation
{
  "conversationId": "test_conversation_id",
  "orgId": "test_org",
  "summaryType": "final",
  "provider": "openai"
}
```

**Expected Result:**
- [ ] Summary is generated
- [ ] No API errors
- [ ] Cost is tracked

### Step 4: Test Embeddings

```json
// api.memory.embeddings.generateMemoryEmbedding
{
  "memoryId": "YOUR_MEMORY_ID",
  "model": "text-embedding-3-small"
}
```

**Expected Result:**
- [ ] Embedding is generated
- [ ] Dimensions = 1536
- [ ] Cost is tracked

### Step 5: Verify Cron Jobs

**Check Convex Dashboard:**
- [ ] `process-memory-jobs` - Every 5 minutes
- [ ] `expire-old-memories` - Daily 2 AM
- [ ] `consolidate-memories` - Daily 3 AM
- [ ] `decay-relevance-scores` - Daily 4 AM
- [ ] `generate-missing-embeddings` - Hourly
- [ ] `update-memory-analytics` - Daily 12:05 AM
- [ ] `cleanup-old-jobs` - Weekly Monday 1 AM

### Step 6: Deploy Frontend

```bash
cd apps/web

# Build and deploy
pnpm run build

# Deploy to Vercel
vercel --prod
```

### Step 7: Verify Production

**Test in Production:**
- [ ] Create a test conversation
- [ ] Send messages
- [ ] Check if memories are created
- [ ] Verify retrieval works
- [ ] Check analytics dashboard
- [ ] Verify costs are tracked

## 🔍 Post-Deployment Verification

### 1. Database Health
```bash
# Check Convex logs
# Look for:
# - Memory creation logs
# - Job processing logs
# - No error messages
```

### 2. Function Tests

**Create Memory:**
- [ ] Can create short-term memory
- [ ] Memory appears in database
- [ ] Metadata is saved correctly

**Retrieval:**
- [ ] Recency retrieval works
- [ ] Hybrid retrieval works
- [ ] Context-ranked retrieval works

**Summarization:**
- [ ] Summaries are generated
- [ ] Customer insights are extracted
- [ ] Sentiment is analyzed

**Embeddings:**
- [ ] Embeddings are generated
- [ ] Vector search works
- [ ] Costs are tracked

### 3. Analytics Check

```typescript
// Get analytics
const analytics = await getMemoryAnalytics(orgId);

// Verify:
```
- [ ] `totalMemories` > 0
- [ ] `totalCost` is tracked
- [ ] `healthScore` is calculated
- [ ] Daily data is populated

### 4. Cost Monitoring

**Day 1:**
- [ ] Check baseline costs
- [ ] Verify tracking is working
- [ ] Set up cost alerts

**Week 1:**
- [ ] Review weekly costs
- [ ] Adjust expiration policies if needed
- [ ] Optimize embedding frequency

**Month 1:**
- [ ] Review monthly costs
- [ ] Analyze cost breakdown
- [ ] Optimize configuration

## 🎯 Performance Benchmarks

### Expected Metrics

**Memory Creation:**
- Time: < 100ms
- Cost: ~$0.00002 per memory (with embeddings)

**Retrieval:**
- Time: < 100ms
- Results: 5-10 memories

**Summarization:**
- Time: 3-10 seconds
- Cost: ~$0.10 per conversation

**Embeddings:**
- Time: < 1 second per memory
- Cost: ~$0.00002 per memory

## 🚨 Monitoring Setup

### 1. Set Up Alerts

**Cost Alerts:**
- [ ] Daily cost > $10
- [ ] Monthly cost > $100
- [ ] Sudden spike (2x average)

**Health Alerts:**
- [ ] Health score < 60
- [ ] Failed jobs > 5
- [ ] Stale memories > 50%

**Performance Alerts:**
- [ ] Retrieval time > 500ms
- [ ] Job processing time > 10 minutes
- [ ] Memory creation failures

### 2. Dashboard Setup

**Create Monitoring Dashboard:**
- [ ] Total memories chart
- [ ] Cost trend chart
- [ ] Health score gauge
- [ ] Job success rate
- [ ] Retrieval performance

### 3. Logging

**Enable Detailed Logs:**
```typescript
// In config.ts
analytics: {
  detailedLogging: true,
}
```

**Monitor Logs:**
- [ ] Memory creation events
- [ ] Job processing events
- [ ] API errors
- [ ] Cost updates

## 🔄 Rollback Plan

### If Issues Occur

**Step 1: Disable Features**
```typescript
// In config.ts
features: {
  autoSummarization: false,
  autoEmbeddings: false,
  memoryConsolidation: false,
}
```

**Step 2: Stop Cron Jobs**
```bash
# Temporarily disable in Convex dashboard
# Or comment out in cron.ts
```

**Step 3: Investigate**
- Check Convex logs
- Check API error rates
- Check cost spike causes
- Check database queries

**Step 4: Fix and Redeploy**
- Apply fixes
- Test in development
- Deploy to production
- Re-enable features gradually

## ✅ Deployment Complete!

### Final Checks
- [ ] All tests pass
- [ ] No errors in logs
- [ ] Costs are reasonable
- [ ] Analytics are updating
- [ ] Health score is good
- [ ] Users can create memories
- [ ] Retrieval is fast
- [ ] Summaries are generated

### Next Steps
1. **Monitor for 24 hours**
   - Watch costs
   - Check health score
   - Monitor job success rate

2. **Review after 1 week**
   - Analyze cost trends
   - Review usage patterns
   - Optimize configuration

3. **Monthly review**
   - Full cost analysis
   - Performance optimization
   - Feature usage review

## 📞 Support

**If Issues Arise:**
1. Check Convex dashboard logs
2. Review API error messages
3. Check environment variables
4. Verify API keys are valid
5. Review cost dashboard
6. Check health score recommendations

**Documentation:**
- Full docs: `packages/backend/convex/memory/README.md`
- Quick start: `packages/backend/convex/memory/QUICKSTART.md`
- Integration: `INTEGRATION_GUIDE.md`

## 🎉 Success!

Your memory system is now deployed and running in production!

**What's Happening:**
- ✅ Messages automatically create memories
- ✅ Conversations are summarized
- ✅ Embeddings are generated
- ✅ Memories expire automatically
- ✅ Costs are tracked
- ✅ Analytics are updated

Enjoy your intelligent AI memory system! 🚀
