/**
 * LINE Messaging Service
 * Send notifications to LINE groups using Messaging API
 * Features:
 * - Rate limiting with Bottleneck queue
 * - Exponential backoff with jitter
 * - Retry-After header support
 * - Prometheus metrics
 * - Structured logging
 */

import {
  RateLimiterRegistry,
  DEFAULT_RETRY_CONFIG,
  calculateBackoffDelay,
  getRetryAfterSeconds,
  type RetryConfig,
} from './rate-limiter';
import { lineMetrics, ApiLogger } from './metrics';
import type Bottleneck from 'bottleneck';

interface LineMessage {
  type: string;
  text?: string;
  altText?: string;
  contents?: any;
  quickReply?: {
    items: Array<{
      type: string;
      action: any;
    }>;
  };
}

interface LinePushRequest {
  to: string;
  messages: LineMessage[];
}

/**
 * LINE API Client with rate limiting and retry logic
 */
export class LineMessagingService {
  private readonly channelAccessToken: string;
  private readonly apiUrl = 'https://api.line.me/v2/bot/message/push';
  private readonly rateLimiter: Bottleneck;
  private readonly retryConfig: RetryConfig;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!this.channelAccessToken) {
      console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables');
    }

    // Initialize rate limiter
    this.rateLimiter = RateLimiterRegistry.getLineLimiter();

    // Initialize retry configuration
    this.retryConfig = DEFAULT_RETRY_CONFIG;

    // Setup rate limiter event handlers for metrics
    this.setupRateLimiterHandlers();
  }

  /**
   * Setup event handlers for rate limiter
   */
  private setupRateLimiterHandlers(): void {
    this.rateLimiter.on('queued', () => {
      const counts = this.rateLimiter.counts();
      lineMetrics.updateQueueLength(counts.QUEUED);
    });

    this.rateLimiter.on('executing', () => {
      const counts = this.rateLimiter.counts();
      lineMetrics.updateQueueLength(counts.QUEUED);
    });

    this.rateLimiter.on('done', () => {
      const counts = this.rateLimiter.counts();
      lineMetrics.updateQueueLength(counts.QUEUED);
    });
  }

  /**
   * Check if LINE service is configured
   */
  isConfigured(): boolean {
    return !!this.channelAccessToken;
  }

  /**
   * Internal method to make API request (wrapped by rate limiter)
   */
  private async makeApiRequest(
    to: string,
    messages: LineMessage[],
    requestId: string,
    attempt: number
  ): Promise<{ success: boolean; response?: Response; error?: any }> {
    const startTime = Date.now();

    try {
      const body: LinePushRequest = { to, messages };

      // Record request in metrics
      lineMetrics.recordRequest(this.apiUrl, 'POST');

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const duration = (Date.now() - startTime) / 1000;

      // Record response in metrics
      lineMetrics.recordResponse(this.apiUrl, response.status, duration);

      // Log response
      ApiLogger.logResponse(requestId, {
        endpoint: this.apiUrl,
        method: 'POST',
        status: response.status,
        duration,
        attempt,
        maxRetries: this.retryConfig.maxRetries,
      });

      return { success: true, response };
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      ApiLogger.logResponse(requestId, {
        endpoint: this.apiUrl,
        method: 'POST',
        status: 0,
        duration,
        attempt,
        error: error.message || String(error),
      });

      return { success: false, error };
    }
  }

  /**
   * Send a push message to a user or group with rate limiting and retry logic
   */
  async sendPushMessage(to: string, messages: LineMessage[], retries?: number): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('LINE service is not configured. Please set LINE_CHANNEL_ACCESS_TOKEN.');
      return false;
    }

    const maxRetries = retries ?? this.retryConfig.maxRetries;

    // Generate request ID for tracking
    const requestId = ApiLogger.logRequest({
      endpoint: this.apiUrl,
      method: 'POST',
    });

    // Wrap the request in rate limiter queue
    return this.rateLimiter.schedule(async () => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await this.makeApiRequest(to, messages, requestId, attempt);

        if (!result.success) {
          // Network error
          if (attempt < maxRetries) {
            const delay = calculateBackoffDelay(attempt, this.retryConfig);
            ApiLogger.logRetry(requestId, attempt, maxRetries, delay, 'network_error');
            lineMetrics.recordRetry(this.apiUrl, 'network_error');
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          console.error('❌ All retry attempts failed (network error)');
          return false;
        }

        const response = result.response!;

        // Parse response body
        const responseText = await response.text();
        let responseData: any = {};

        try {
          if (responseText) {
            responseData = JSON.parse(responseText);
          }
        } catch (e) {
          // Response is not JSON, likely empty (which is good for success)
        }

        // Handle success
        if (response.ok) {
          // Check if response contains error even with 200 status
          if (responseData.message && responseData.message.includes('error')) {
            console.error('❌ LINE API returned error in 200 response:', JSON.stringify(responseData, null, 2));
            return false;
          }

          console.log('✅ LINE message sent successfully to:', to);
          return true;
        }

        // Handle errors
        console.error(`❌ LINE API Error (Attempt ${attempt}/${maxRetries}):`, {
          status: response.status,
          to,
          response: responseData,
        });

        // Handle 429 Rate Limit
        if (response.status === 429) {
          ApiLogger.log429(requestId, this.apiUrl, getRetryAfterSeconds(response));

          if (attempt < maxRetries) {
            // Respect Retry-After header if present
            const retryAfterSeconds = getRetryAfterSeconds(response);
            const delay = calculateBackoffDelay(attempt, this.retryConfig, retryAfterSeconds);

            console.log(`⏳ Rate limited (429). Retrying in ${delay}ms...`);
            ApiLogger.logRetry(requestId, attempt, maxRetries, delay, 'rate_limit_429');
            lineMetrics.recordRetry(this.apiUrl, 'rate_limit_429');

            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          console.error('❌ Rate limit exceeded. All retry attempts failed.');
          return false;
        }

        // For other client errors (4xx except 429), don't retry
        if (response.status >= 400 && response.status < 500) {
          console.error('❌ Client error (4xx). Not retrying.');
          return false;
        }

        // For server errors (5xx), retry with exponential backoff
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt, this.retryConfig);
          console.log(`⏳ Server error (5xx). Retrying in ${delay}ms...`);
          ApiLogger.logRetry(requestId, attempt, maxRetries, delay, 'server_error_5xx');
          lineMetrics.recordRetry(this.apiUrl, 'server_error_5xx');

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // No more retries
        return false;
      }

      return false;
    });
  }

  /**
   * Send a simple text message
   */
  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const messages: LineMessage[] = [
      {
        type: 'text',
        text,
      },
    ];

    return this.sendPushMessage(to, messages);
  }

  /**
   * Send a Flex Message
   */
  async sendFlexMessage(to: string, altText: string, flexContents: any, quickReply?: any): Promise<boolean> {
    const message: LineMessage = {
      type: 'flex',
      altText,
      contents: flexContents,
    };

    if (quickReply) {
      message.quickReply = quickReply;
    }

    return this.sendPushMessage(to, [message]);
  }

  /**
   * Send a Flex Message with Quick Reply buttons
   */
  async sendFlexMessageWithQuickReply(
    to: string,
    altText: string,
    flexContents: any,
    quickReplyItems: Array<{ label: string; url: string }>
  ): Promise<boolean> {
    const quickReply = {
      items: quickReplyItems.map(item => ({
        type: 'action',
        action: {
          type: 'uri',
          label: item.label,
          uri: item.url,
        },
      })),
    };

    return this.sendFlexMessage(to, altText, flexContents, quickReply);
  }
}

/**
 * Singleton instance
 */
export const lineService = new LineMessagingService();

/**
 * Helper function to send LINE notification
 */
export async function sendLineNotification(
  to: string,
  message: string | LineMessage[]
): Promise<boolean> {
  if (typeof message === 'string') {
    return lineService.sendTextMessage(to, message);
  } else {
    return lineService.sendPushMessage(to, message);
  }
}
