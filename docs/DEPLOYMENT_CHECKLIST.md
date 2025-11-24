# HTTP 429 Solution - Deployment Checklist

Use this checklist when deploying the rate limiting solution to production.

## Pre-Deployment

### 1. Review Configuration
- [ ] Read [docs/RATE_LIMITING.md](./RATE_LIMITING.md) documentation
- [ ] Identify your LINE Messaging API tier (Free/Basic/Standard)
- [ ] Choose appropriate rate limit preset from [.env.example](../.env.example)

### 2. Environment Variables
- [ ] Copy `.env.example` to `.env` (if not exists)
- [ ] Set `LINE_RATE_LIMIT_MAX_CONCURRENCY` (recommended: start conservative)
- [ ] Set `LINE_RATE_LIMIT_MIN_TIME_MS` (recommended: start conservative)
- [ ] Set `API_MAX_RETRIES=4` (or keep default)
- [ ] Set `API_RETRY_JITTER_MS=200` (or keep default)
- [ ] **Optional:** Set `METRICS_SECRET` for metrics endpoint authentication
- [ ] **Optional:** Set `CRON_SECRET` for cron endpoint authentication

**Recommended Starting Values:**

```bash
# Conservative settings (recommended for first deployment)
LINE_RATE_LIMIT_MAX_CONCURRENCY=3
LINE_RATE_LIMIT_MIN_TIME_MS=300
API_MAX_RETRIES=4
API_RETRY_JITTER_MS=200
```

### 3. Dependencies
- [ ] Verify `bottleneck` is installed: `npm list bottleneck`
- [ ] Verify `prom-client` is installed: `npm list prom-client`
- [ ] If not installed: `npm install bottleneck prom-client`

### 4. Code Review
- [ ] Review changes in [lib/line.ts](../lib/line.ts)
- [ ] Review new [lib/rate-limiter.ts](../lib/rate-limiter.ts)
- [ ] Review new [lib/metrics.ts](../lib/metrics.ts)
- [ ] Review new [app/api/metrics/route.ts](../app/api/metrics/route.ts)

### 5. Testing (Staging Environment)
- [ ] Deploy to staging/test environment
- [ ] Test basic LINE notifications work
- [ ] Send burst of requests (10+) and verify they're queued
- [ ] Check metrics endpoint: `GET /api/metrics?format=json`
- [ ] Verify structured logs in console
- [ ] Test SLA cron job with multiple tickets
- [ ] Test ticket creation with department assignment
- [ ] Simulate 429 error (set very low limits) and verify retry behavior

## Deployment

### 1. Deploy Application
- [ ] Deploy code to production
- [ ] Verify deployment successful
- [ ] Check application starts without errors

### 2. Verify Environment Variables
```bash
# SSH into production server or use your platform's env viewer
echo $LINE_RATE_LIMIT_MAX_CONCURRENCY
echo $LINE_RATE_LIMIT_MIN_TIME_MS
echo $API_MAX_RETRIES
```

### 3. Smoke Tests
- [ ] Test metrics endpoint: `curl https://your-domain.com/api/metrics?format=json`
- [ ] Send a test LINE notification
- [ ] Verify notification received
- [ ] Check logs for structured format with request IDs

## Post-Deployment Monitoring

### Day 1 - Initial Monitoring

- [ ] Monitor metrics every hour:
  ```bash
  curl https://your-domain.com/api/metrics?format=json
  ```

- [ ] Check for these key indicators:
  - [ ] `rateLimitErrors` should be 0 or very low
  - [ ] `queueLength` should be reasonable (<10 typically)
  - [ ] `retries` should be low (<5% of total requests)
  - [ ] `totalRequests` matches expected traffic

- [ ] Review logs for:
  - [ ] Any 429 errors
  - [ ] Retry patterns
  - [ ] Request IDs are present
  - [ ] Duration times are reasonable

### Week 1 - Tuning Period

- [ ] Monitor daily metrics
- [ ] If seeing 429 errors:
  - [ ] Decrease `LINE_RATE_LIMIT_MAX_CONCURRENCY` by 1-2
  - [ ] Increase `LINE_RATE_LIMIT_MIN_TIME_MS` by 50-100ms
  - [ ] Deploy and monitor
- [ ] If requests are slow:
  - [ ] Check queue length
  - [ ] Gradually increase concurrency by 1
  - [ ] Monitor for 429 errors
- [ ] Document optimal settings found

### Ongoing Monitoring

- [ ] Set up dashboard/alerts (recommended):
  - [ ] Alert: 429 error rate > 5% in 5 minutes
  - [ ] Alert: Queue length > 50 for 2+ minutes
  - [ ] Alert: Retry rate > 20% of total requests

- [ ] Weekly review:
  - [ ] Check metrics trends
  - [ ] Review any incidents
  - [ ] Adjust configuration if needed

## Rollback Plan

If issues occur after deployment:

### Option 1: Adjust Configuration (Preferred)
```bash
# Make more conservative
LINE_RATE_LIMIT_MAX_CONCURRENCY=2
LINE_RATE_LIMIT_MIN_TIME_MS=500
```

### Option 2: Emergency Rollback
The new implementation is backward compatible, but if you need to rollback:

1. [ ] Keep the new code (no code rollback needed)
2. [ ] Adjust rate limits to be very permissive:
   ```bash
   LINE_RATE_LIMIT_MAX_CONCURRENCY=50
   LINE_RATE_LIMIT_MIN_TIME_MS=10
   ```
   This effectively disables rate limiting while keeping retry logic

3. [ ] Monitor and investigate root cause

## Success Criteria

After 1 week, you should see:

- [ ] **429 error rate < 1%** (target: 0%)
- [ ] **Retry rate < 10%** of total requests
- [ ] **Queue length < 20** during normal operation
- [ ] **No user complaints** about notification delays
- [ ] **Structured logs** with request IDs
- [ ] **Metrics endpoint** responding correctly

## Troubleshooting

### High 429 Error Rate
```bash
# Quick fix: Make more conservative
LINE_RATE_LIMIT_MAX_CONCURRENCY=2
LINE_RATE_LIMIT_MIN_TIME_MS=400
```

### Notifications Too Slow
```bash
# Check queue length first
curl https://your-domain.com/api/metrics?format=json | jq '.metrics.queueLength'

# If queue is building up, gradually increase concurrency
LINE_RATE_LIMIT_MAX_CONCURRENCY=6  # Increase by 1-2 at a time
```

### No Metrics Data
```bash
# Check metrics endpoint
curl https://your-domain.com/api/metrics?format=json

# If 401 Unauthorized, verify METRICS_SECRET
curl -H "Authorization: Bearer $METRICS_SECRET" \
  https://your-domain.com/api/metrics?format=json
```

## Configuration Adjustment Log

Use this section to document changes made post-deployment:

```
Date       | Setting                       | Old Value | New Value | Reason
-----------|-------------------------------|-----------|-----------|------------------
2025-11-24 | LINE_RATE_LIMIT_MAX_CONCURRENCY | 5        | 3         | Seeing 429 errors
2025-11-25 | LINE_RATE_LIMIT_MIN_TIME_MS    | 200      | 300       | Still seeing 429s
2025-11-27 | LINE_RATE_LIMIT_MAX_CONCURRENCY | 3        | 4         | No 429s, increase throughput
```

## Support & Documentation

- **Full Documentation:** [docs/RATE_LIMITING.md](./RATE_LIMITING.md)
- **Implementation Summary:** [docs/HTTP_429_SOLUTION.md](./HTTP_429_SOLUTION.md)
- **Environment Variables:** [.env.example](../.env.example)
- **LINE API Docs:** https://developers.line.biz/en/reference/messaging-api/#rate-limits

## Sign-off

- [ ] Configuration reviewed and approved
- [ ] Staging tests passed
- [ ] Production deployment successful
- [ ] Initial monitoring shows healthy metrics
- [ ] Team notified of new monitoring endpoints
- [ ] Documentation reviewed by team

**Deployed by:** ________________
**Date:** ________________
**Approved by:** ________________
**Date:** ________________
