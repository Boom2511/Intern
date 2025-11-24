# Rate Limiting & Error Handling Configuration

This document describes the rate limiting, retry logic, and monitoring capabilities implemented to prevent HTTP 429 (Too Many Requests) errors when calling external APIs.

## Overview

The system implements comprehensive client-side request throttling and retry logic to prevent 429 errors from the LINE Messaging API and other external services.

### Key Features

1. **Request Queue with Rate Limiting** - Uses Bottleneck library to queue and throttle requests
2. **Exponential Backoff with Jitter** - Intelligent retry strategy with randomization
3. **Retry-After Header Support** - Respects server-provided retry timing
4. **Prometheus Metrics** - Track 429 errors, retry rates, and queue length
5. **Structured Logging** - Request IDs and detailed logging for debugging
6. **Configurable via Environment Variables** - Easy to tune for different API tiers

## Architecture

### Components

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LINE Service   │  ← Handles business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiter   │  ← Queues & throttles requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Retry Logic    │  ← Exponential backoff + jitter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Metrics        │  ← Prometheus + structured logs
└─────────────────┘
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# LINE API Rate Limiting
LINE_RATE_LIMIT_MAX_CONCURRENCY=5        # Max concurrent requests (default: 5)
LINE_RATE_LIMIT_MIN_TIME_MS=200          # Min time between requests in ms (default: 200)

# Optional: Token bucket for burst control
LINE_RATE_LIMIT_RESERVOIR=50             # Max tokens in bucket (optional)
LINE_RATE_LIMIT_RESERVOIR_REFRESH=10     # Tokens added per interval (optional)
LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS=1000  # Refill interval in ms (optional)

# Retry Configuration
API_MAX_RETRIES=4                        # Max retry attempts (default: 4)
API_RETRY_JITTER_MS=200                  # Jitter for randomization (default: 200)

# Metrics Security (optional)
METRICS_SECRET=your-secret-token         # Bearer token for /api/metrics endpoint

# Cron Job Security (optional)
CRON_SECRET=your-cron-secret            # Bearer token for /api/cron/* endpoints
```

### Rate Limit Recommendations by LINE API Tier

#### Free Tier (~500 pushes/minute)
```bash
LINE_RATE_LIMIT_MAX_CONCURRENCY=3
LINE_RATE_LIMIT_MIN_TIME_MS=300
LINE_RATE_LIMIT_RESERVOIR=50
LINE_RATE_LIMIT_RESERVOIR_REFRESH=8
LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS=1000
```

#### Basic Tier (~1000 pushes/minute)
```bash
LINE_RATE_LIMIT_MAX_CONCURRENCY=5
LINE_RATE_LIMIT_MIN_TIME_MS=200
LINE_RATE_LIMIT_RESERVOIR=100
LINE_RATE_LIMIT_RESERVOIR_REFRESH=16
LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS=1000
```

#### Standard Tier (~2000 pushes/minute)
```bash
LINE_RATE_LIMIT_MAX_CONCURRENCY=10
LINE_RATE_LIMIT_MIN_TIME_MS=100
LINE_RATE_LIMIT_RESERVOIR=200
LINE_RATE_LIMIT_RESERVOIR_REFRESH=33
LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS=1000
```

## Retry Strategy

### Exponential Backoff Formula

```
delay = min(baseDelay * 2^(attempt - 1), maxDelay) + random(0, jitter)
```

### Default Retry Behavior

| Attempt | Base Delay | With Jitter Range |
|---------|-----------|-------------------|
| 1       | 1s        | 1.0s - 1.2s      |
| 2       | 2s        | 2.0s - 2.2s      |
| 3       | 4s        | 4.0s - 4.2s      |
| 4       | 8s        | 8.0s - 8.2s      |

### HTTP Status Code Handling

| Status | Behavior | Retry |
|--------|----------|-------|
| 200-299 | Success | No |
| 429 | Rate limit - Use Retry-After header or exponential backoff | Yes |
| 400-499 (except 429) | Client error - No retry | No |
| 500-599 | Server error - Exponential backoff | Yes |
| Network error | Exponential backoff | Yes |

### Retry-After Header

When LINE API returns a 429 with `Retry-After` header, the system will:
1. Parse the header (supports both seconds and HTTP date format)
2. Wait for the specified duration before retrying
3. Fall back to exponential backoff if header is missing/invalid

## Monitoring & Metrics

### Prometheus Metrics Endpoint

**Endpoint:** `GET /api/metrics`

**Authentication:** Optional Bearer token via `METRICS_SECRET` env var

**Formats:**
- Prometheus: `GET /api/metrics` (default)
- JSON: `GET /api/metrics?format=json`

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `line_api_requests_total` | Counter | Total API requests |
| `line_api_responses_by_status` | Counter | Responses grouped by status code |
| `line_api_rate_limit_errors_total` | Counter | Total 429 errors |
| `line_api_retries_total` | Counter | Total retry attempts by reason |
| `line_api_queue_length` | Gauge | Current requests in queue |
| `line_api_request_duration_seconds` | Histogram | Request duration distribution |
| `line_api_last_rate_limit_error_timestamp` | Gauge | Unix timestamp of last 429 |

### Structured Logging

All API requests are logged with structured JSON format:

```json
{
  "requestId": "1732464000000-abc123def",
  "timestamp": "2025-11-24T10:30:00.000Z",
  "endpoint": "https://api.line.me/v2/bot/message/push",
  "method": "POST",
  "status": 200,
  "duration": 0.345,
  "attempt": 1,
  "maxRetries": 4
}
```

### Monitoring Examples

#### Check metrics in JSON format
```bash
curl http://localhost:3000/api/metrics?format=json
```

#### Check Prometheus metrics
```bash
curl http://localhost:3000/api/metrics
```

#### With authentication
```bash
curl -H "Authorization: Bearer your-secret-token" \
  http://localhost:3000/api/metrics?format=json
```

## Alerting Recommendations

### Alert on High 429 Rate

**Condition:** 429 error rate > 5% in last 5 minutes

**Action:**
1. Check LINE API tier/quota
2. Adjust rate limit settings
3. Consider upgrading LINE API tier

### Alert on Queue Length

**Condition:** Queue length > 50 for 2+ minutes

**Action:**
1. Check if there's a traffic spike
2. Increase concurrency if API allows
3. Consider implementing request prioritization

### Alert on Retry Rate

**Condition:** Retry rate > 20% of total requests

**Action:**
1. Check LINE API status
2. Review logs for error patterns
3. Consider temporary circuit breaker

## Testing

### Test Rate Limiting Behavior

```bash
# Send multiple test notifications quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/line/test &
done

# Check metrics
curl http://localhost:3000/api/metrics?format=json
```

### Simulate 429 Error Handling

You can manually test retry behavior by:
1. Setting very aggressive rate limits
2. Sending burst of requests
3. Monitoring logs for retry attempts

## Troubleshooting

### Issue: Still getting 429 errors

**Solutions:**
1. Decrease `LINE_RATE_LIMIT_MAX_CONCURRENCY`
2. Increase `LINE_RATE_LIMIT_MIN_TIME_MS`
3. Enable token bucket with conservative settings
4. Check if multiple instances are running (shared quota)

### Issue: Requests are too slow

**Solutions:**
1. Increase `LINE_RATE_LIMIT_MAX_CONCURRENCY` gradually
2. Decrease `LINE_RATE_LIMIT_MIN_TIME_MS` if 429 rate is low
3. Verify your LINE API tier supports higher throughput

### Issue: Queue building up

**Solutions:**
1. Check metrics to see where bottleneck is
2. Consider if request volume exceeds API limits
3. Implement request prioritization (critical vs. non-critical)
4. Add overflow handling (fail fast for non-critical requests)

## Best Practices

1. **Start Conservative** - Begin with lower limits and increase gradually
2. **Monitor Metrics** - Set up dashboards to track 429 rate and queue length
3. **Separate Critical Flows** - Use different tokens/channels for critical notifications
4. **Log Everything** - Structured logs help debug rate limit issues
5. **Test Under Load** - Simulate production traffic patterns in staging
6. **Set Up Alerts** - Proactive alerts prevent user-facing issues
7. **Document Incidents** - Track 429 incidents to tune configuration

## Architecture Decisions

### Why Bottleneck?
- Mature, well-tested library
- Token bucket algorithm support
- Event-driven for metrics integration
- Works in serverless environments

### Why Client-Side Rate Limiting?
- Prevents requests from reaching the API
- Reduces network overhead
- Provides better visibility and control
- Works alongside server-side limits

### Why Exponential Backoff with Jitter?
- Prevents thundering herd problem
- Respects server recovery time
- Industry standard for retry logic
- Configurable for different scenarios

## Related Files

- [`lib/rate-limiter.ts`](../lib/rate-limiter.ts) - Rate limiter implementation
- [`lib/metrics.ts`](../lib/metrics.ts) - Metrics collector
- [`lib/line.ts`](../lib/line.ts) - LINE service with rate limiting
- [`app/api/metrics/route.ts`](../app/api/metrics/route.ts) - Metrics endpoint

## References

- [LINE Messaging API Rate Limits](https://developers.line.biz/en/reference/messaging-api/#rate-limits)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Bottleneck Documentation](https://github.com/SGrondin/bottleneck)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
