/**
 * Metrics Collector for API Request Monitoring
 * Tracks 429 errors, retry rates, queue length, and API performance
 */

import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * Metrics for LINE API requests
 */
export class LineApiMetrics {
  private static instance: LineApiMetrics;

  // Counter for total requests
  public readonly requestsTotal: Counter;

  // Counter for HTTP status codes
  public readonly responsesByStatus: Counter;

  // Counter for 429 rate limit errors
  public readonly rateLimitErrors: Counter;

  // Counter for retries
  public readonly retriesTotal: Counter;

  // Gauge for current queue length
  public readonly queueLength: Gauge;

  // Histogram for request duration
  public readonly requestDuration: Histogram;

  // Gauge for last 429 error timestamp
  public readonly lastRateLimitError: Gauge;

  private constructor() {
    // Initialize Prometheus metrics
    this.requestsTotal = new Counter({
      name: 'line_api_requests_total',
      help: 'Total number of LINE API requests',
      labelNames: ['endpoint', 'method'],
    });

    this.responsesByStatus = new Counter({
      name: 'line_api_responses_by_status',
      help: 'LINE API responses grouped by status code',
      labelNames: ['endpoint', 'status'],
    });

    this.rateLimitErrors = new Counter({
      name: 'line_api_rate_limit_errors_total',
      help: 'Total number of 429 rate limit errors',
      labelNames: ['endpoint'],
    });

    this.retriesTotal = new Counter({
      name: 'line_api_retries_total',
      help: 'Total number of retry attempts',
      labelNames: ['endpoint', 'reason'],
    });

    this.queueLength = new Gauge({
      name: 'line_api_queue_length',
      help: 'Current number of requests in queue',
    });

    this.requestDuration = new Histogram({
      name: 'line_api_request_duration_seconds',
      help: 'LINE API request duration in seconds',
      labelNames: ['endpoint', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.lastRateLimitError = new Gauge({
      name: 'line_api_last_rate_limit_error_timestamp',
      help: 'Unix timestamp of the last 429 error',
    });
  }

  public static getInstance(): LineApiMetrics {
    if (!LineApiMetrics.instance) {
      LineApiMetrics.instance = new LineApiMetrics();
    }
    return LineApiMetrics.instance;
  }

  /**
   * Record a request
   */
  recordRequest(endpoint: string, method: string): void {
    this.requestsTotal.inc({ endpoint, method });
  }

  /**
   * Record a response
   */
  recordResponse(endpoint: string, status: number, durationSeconds: number): void {
    this.responsesByStatus.inc({ endpoint, status: status.toString() });
    this.requestDuration.observe({ endpoint, status: status.toString() }, durationSeconds);

    // Track 429 errors specifically
    if (status === 429) {
      this.rateLimitErrors.inc({ endpoint });
      this.lastRateLimitError.set(Date.now() / 1000);
    }
  }

  /**
   * Record a retry attempt
   */
  recordRetry(endpoint: string, reason: string): void {
    this.retriesTotal.inc({ endpoint, reason });
  }

  /**
   * Update queue length
   */
  updateQueueLength(length: number): void {
    this.queueLength.set(length);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics summary for alerts
   */
  getMetricsSummary(): {
    totalRequests: number;
    rateLimitErrors: number;
    retries: number;
    queueLength: number;
    rateLimitErrorRate: number;
  } {
    const totalRequests = (this.requestsTotal as any)._metrics?.size || 0;
    const rateLimitErrors = (this.rateLimitErrors as any)._metrics?.size || 0;
    const retries = (this.retriesTotal as any)._metrics?.size || 0;
    const queueLength = (this.queueLength as any)._value || 0;

    const rateLimitErrorRate = totalRequests > 0 ? (rateLimitErrors / totalRequests) * 100 : 0;

    return {
      totalRequests,
      rateLimitErrors,
      retries,
      queueLength,
      rateLimitErrorRate,
    };
  }
}

/**
 * Structured logger for API requests
 */
export interface RequestLog {
  requestId: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status?: number;
  duration?: number;
  attempt?: number;
  maxRetries?: number;
  error?: string;
  retryAfter?: number;
  queueLength?: number;
}

export class ApiLogger {
  private static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static logRequest(log: Partial<RequestLog>): string {
    const requestId = log.requestId || this.generateRequestId();
    const fullLog: RequestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      endpoint: log.endpoint || 'unknown',
      method: log.method || 'unknown',
      ...log,
    };

    console.log('[API Request]', JSON.stringify(fullLog));
    return requestId;
  }

  static logResponse(requestId: string, log: Partial<RequestLog>): void {
    const fullLog: RequestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      endpoint: log.endpoint || 'unknown',
      method: log.method || 'unknown',
      ...log,
    };

    const logLevel = log.status && log.status >= 400 ? '[API Error]' : '[API Response]';
    console.log(logLevel, JSON.stringify(fullLog));
  }

  static logRetry(requestId: string, attempt: number, maxRetries: number, delay: number, reason: string): void {
    const log: RequestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      endpoint: 'retry',
      method: 'retry',
      attempt,
      maxRetries,
      duration: delay,
      error: reason,
    };

    console.log('[API Retry]', JSON.stringify(log));
  }

  static log429(requestId: string, endpoint: string, retryAfter?: number): void {
    const log: RequestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      endpoint,
      method: 'POST',
      status: 429,
      retryAfter,
      error: 'Rate limit exceeded',
    };

    console.error('[API 429]', JSON.stringify(log));
  }
}

/**
 * Singleton instance for metrics
 */
export const lineMetrics = LineApiMetrics.getInstance();
