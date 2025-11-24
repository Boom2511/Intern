/**
 * Rate Limiter and Request Queue
 * Prevents HTTP 429 errors by throttling requests to external APIs
 */

import Bottleneck from 'bottleneck';

export interface RateLimiterConfig {
  maxConcurrent: number;
  minTime: number;
  reservoir?: number;
  reservoirRefreshAmount?: number;
  reservoirRefreshInterval?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterMs: number;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): Bottleneck {
  return new Bottleneck({
    maxConcurrent: config.maxConcurrent,
    minTime: config.minTime,
    reservoir: config.reservoir,
    reservoirRefreshAmount: config.reservoirRefreshAmount,
    reservoirRefreshInterval: config.reservoirRefreshInterval,
  });
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterSeconds?: number
): number {
  // If server provides Retry-After header, respect it
  if (retryAfterSeconds) {
    return retryAfterSeconds * 1000;
  }

  // Exponential backoff: baseDelay * (2 ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * config.jitterMs;

  return cappedDelay + jitter;
}

/**
 * Extract Retry-After header value
 */
export function getRetryAfterSeconds(response: Response): number | undefined {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) {
    return undefined;
  }

  // Retry-After can be either seconds or HTTP date
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Try parsing as HTTP date
  try {
    const retryDate = new Date(retryAfter);
    const now = new Date();
    const diffSeconds = Math.max(0, (retryDate.getTime() - now.getTime()) / 1000);
    return diffSeconds;
  } catch {
    return undefined;
  }
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: parseInt(process.env.API_MAX_RETRIES || '4', 10),
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  jitterMs: parseInt(process.env.API_RETRY_JITTER_MS || '200', 10),
};

/**
 * LINE API rate limiter configuration
 * LINE Messaging API has different rate limits per tier
 * Free tier: ~500 pushes per minute
 * Basic tier: ~1000 pushes per minute
 * Standard tier: ~2000 pushes per minute
 */
export const LINE_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  // Max concurrent requests
  maxConcurrent: parseInt(process.env.LINE_RATE_LIMIT_MAX_CONCURRENCY || '5', 10),

  // Minimum time between requests (ms)
  minTime: parseInt(process.env.LINE_RATE_LIMIT_MIN_TIME_MS || '200', 10),

  // Optional: Token bucket for burst control
  reservoir: process.env.LINE_RATE_LIMIT_RESERVOIR
    ? parseInt(process.env.LINE_RATE_LIMIT_RESERVOIR, 10)
    : undefined,

  reservoirRefreshAmount: process.env.LINE_RATE_LIMIT_RESERVOIR_REFRESH
    ? parseInt(process.env.LINE_RATE_LIMIT_RESERVOIR_REFRESH, 10)
    : undefined,

  reservoirRefreshInterval: process.env.LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS
    ? parseInt(process.env.LINE_RATE_LIMIT_RESERVOIR_INTERVAL_MS, 10)
    : undefined,
};

/**
 * Singleton rate limiter instances for different APIs
 */
export class RateLimiterRegistry {
  private static limiters: Map<string, Bottleneck> = new Map();

  static get(name: string, config: RateLimiterConfig): Bottleneck {
    if (!this.limiters.has(name)) {
      this.limiters.set(name, createRateLimiter(config));
    }
    return this.limiters.get(name)!;
  }

  static getLineLimiter(): Bottleneck {
    return this.get('line', LINE_RATE_LIMITER_CONFIG);
  }

  static reset(): void {
    this.limiters.forEach(limiter => limiter.stop());
    this.limiters.clear();
  }
}
