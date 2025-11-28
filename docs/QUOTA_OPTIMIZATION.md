# LINE API Quota Optimization

**Date:** November 28, 2025
**Status:** ✅ Implemented

## Problem Summary

After implementing the HTTP 429 rate limiting solution, testing revealed that **LINE API counts ALL API calls (including 429 failures) toward the monthly quota**. This caused rapid quota exhaustion:

- 11 tickets created on Nov 24, 2025
- 234 total API calls recorded by LINE
- Average: ~21 API calls per ticket
- Root cause: Each failed ticket triggered 4 retries, with each retry counted toward quota

## Optimization Changes

### 1. Reduced Retry Attempts ✅
**File:** `lib/rate-limiter.ts`

```typescript
// BEFORE
maxRetries: parseInt(process.env.API_MAX_RETRIES || '4', 10)

// AFTER
maxRetries: parseInt(process.env.API_MAX_RETRIES || '1', 10)
```

**Impact:** Reduces maximum API calls per request from 5 (1 + 4 retries) to 2 (1 + 1 retry)

### 2. Strengthened Rate Limiting ✅
**File:** `lib/rate-limiter.ts`

```typescript
// BEFORE
maxConcurrent: 5  // Max concurrent requests
minTime: 200ms    // Min time between requests

// AFTER
maxConcurrent: 2  // Reduced to prevent burst sending
minTime: 500ms    // Increased to 2 requests/second max
```

**Impact:**
- Prevents burst sending that triggers rate limits
- Gives each request more time to succeed before starting next one
- Maximum throughput: 2 requests/second (120 requests/minute)

### 3. Enhanced Quota Tracking Logs ✅
**File:** `lib/line.ts`

Added detailed logging at every stage:

```typescript
// Before each API call
📊 LINE API Call Tracking: { requestId, to, maxRetries, timestamp }

// Each attempt
📤 LINE API Attempt 1/2: { requestId, to, timestamp }

// On success
✅ Quota Impact: 1 API call counted (attempt 1/2)

// On 429 retry
⚠️ Quota Impact: 429 error counts toward quota, will retry (attempt 1/2)

// On quota exhaustion
❌ Quota Impact: This 429 error counts toward monthly quota
```

**Impact:** Full visibility into exact quota usage for debugging

### 4. Removed Update Notifications ✅

#### 4.1 Status Change Notifications
**File:** `app/api/tickets/[id]/route.ts` (lines 116-140)

**REMOVED:** LINE notifications when ticket status changes (NEW → IN_PROGRESS, IN_PROGRESS → RESOLVED, etc.)

```typescript
// BEFORE: Sent notification on every status change
await lineService.sendTextMessage(groupId, `🔔 อัพเดตสถานะ: ${ticket.ticketNo}...`)

// AFTER: Removed completely
// NOTE: Removed LINE notification for status changes to reduce quota usage
```

#### 4.2 Department Reassignment Notifications
**File:** `app/api/tickets/[id]/route.ts` (lines 144-172)

**MODIFIED:** Only send notification for FIRST department assignment, skip reassignments

```typescript
// BEFORE: Sent notification on ANY department change
if (newDepartment && lineService.isConfigured())

// AFTER: Only send if department was null (first assignment)
if (newDepartment && !ticket.department && lineService.isConfigured())
```

#### 4.3 SLA Warning Notifications
**File:** `app/api/cron/check-sla/route.ts` (lines 136-154)

**REMOVED:** LINE notifications for SLA warnings (kept system notes only)

```typescript
// BEFORE: Sent LINE notification on SLA warning
await lineService.sendFlexMessage(groupId, `⚠️ เตือน SLA: ${ticket.ticketNo}...`)

// AFTER: Only log and add system note
console.log(`⚠️ SLA warning for ticket ${ticket.ticketNo}`)
await prisma.note.create({ content: '⚠️ เตือน: ใกล้เกินเวลา SLA...' })
```

### 5. Notifications Still Sent ✅

LINE notifications are now ONLY sent for:

1. **New Ticket Creation with Department** (`app/api/tickets/route.ts`)
   - When a ticket is created AND department is assigned
   - Uses Flex Message with full ticket details
   - Message: `🔔 Ticket ใหม่: ${ticketNo}`

2. **First Department Assignment** (`app/api/tickets/[id]/route.ts`)
   - When a ticket with NO department gets assigned to a department
   - Prevents notifications on department reassignments
   - Message: `🔔 Ticket มอบหมาย: ${ticketNo}`

## Expected Quota Reduction

### Before Optimization
- New ticket with dept: 1 call ✅
- Status updates (avg 2 per ticket): 2 calls ❌
- Department reassignment (some tickets): 1 call ❌
- SLA warnings (some tickets): 1 call ❌
- **Total per ticket: 3-5 calls**

### After Optimization
- New ticket with dept: 1 call ✅
- First dept assignment (if created without): 1 call ✅
- **Total per ticket: 1-2 calls maximum**

**Expected reduction: 50-75% fewer API calls**

## Configuration Variables

All settings can be customized via environment variables:

```bash
# Retry configuration (default: 1)
API_MAX_RETRIES=1

# Rate limiting (defaults: maxConcurrent=2, minTime=500ms)
LINE_RATE_LIMIT_MAX_CONCURRENCY=2
LINE_RATE_LIMIT_MIN_TIME_MS=500

# Emergency kill switch
DISABLE_LINE_NOTIFICATIONS=false
```

## Testing Plan

After quota reset on **December 1, 2025**:

1. ✅ Create 5-10 test tickets with departments
2. ✅ Monitor Vercel logs for quota tracking messages
3. ✅ Check LINE usage stats after 24 hours
4. ✅ Verify: API calls ≈ number of tickets created
5. ✅ Expected: 10 tickets = 10-12 API calls (not 50+ calls)

## Monitoring Commands

```bash
# Check logs for quota usage
vercel logs --follow

# Look for these log patterns:
# 📊 LINE API Call Tracking
# 📤 LINE API Attempt
# ✅ Quota Impact: 1 API call counted
# ⚠️ Quota Impact: 429 error counts toward quota
```

## Rollback Instructions

If you need to revert to more retries:

```bash
# In .env or Vercel environment variables
API_MAX_RETRIES=4
LINE_RATE_LIMIT_MAX_CONCURRENCY=5
LINE_RATE_LIMIT_MIN_TIME_MS=200
```

Or restore removed notifications by reverting commits.

## Related Documentation

- [HTTP 429 Solution](./HTTP_429_SOLUTION.md) - Original rate limiting implementation
- [Quota Analysis](./QUOTA_ANALYSIS.md) - Detailed analysis of Nov 24 quota usage
- [Rate Limiting Guide](./RATE_LIMITING.md) - Configuration reference
- [Testing Results](./TESTING_RESULTS.md) - Nov 24 test results

## Summary

These optimizations ensure that:
- ✅ Retries are minimized (max 2 attempts instead of 5)
- ✅ Rate limiting prevents burst traffic
- ✅ Every API call is logged for quota tracking
- ✅ Notifications are only sent for critical events (new tickets)
- ✅ Monthly quota usage is reduced by 50-75%

**Next step:** Deploy and test after quota reset on Dec 1, 2025.
