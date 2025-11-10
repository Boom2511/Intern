/**
 * LINE Messaging Service
 * Send notifications to LINE groups using Messaging API
 */

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
 * LINE API Client
 */
export class LineMessagingService {
  private readonly channelAccessToken: string;
  private readonly apiUrl = 'https://api.line.me/v2/bot/message/push';

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!this.channelAccessToken) {
      console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables');
    }
  }

  /**
   * Check if LINE service is configured
   */
  isConfigured(): boolean {
    return !!this.channelAccessToken;
  }

  /**
   * Send a push message to a user or group
   */
  async sendPushMessage(to: string, messages: LineMessage[]): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('LINE service is not configured. Please set LINE_CHANNEL_ACCESS_TOKEN.');
      return false;
    }

    try {
      const body: LinePushRequest = {
        to,
        messages,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify(body),
      });

      // Check response body even if status is OK - LINE sometimes returns 200 with errors
      const responseText = await response.text();
      let responseData: any = {};

      try {
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (e) {
        // Response is not JSON, likely empty (which is good)
      }

      if (!response.ok) {
        console.error('❌ LINE API Error Response:', JSON.stringify(responseData, null, 2));
        console.error('❌ LINE API Status:', response.status);
        console.error('❌ LINE API Request to:', to);
        console.error('❌ LINE API Message:', JSON.stringify(messages, null, 2));
        return false;
      }

      // Check if response contains error even with 200 status
      if (responseData.message && responseData.message.includes('error')) {
        console.error('❌ LINE API returned error in 200 response:', JSON.stringify(responseData, null, 2));
        console.error('❌ Message details:', JSON.stringify(messages, null, 2));
        return false;
      }

      console.log('✅ LINE message sent successfully to:', to);
      console.log('📤 Response:', responseText || '(empty - success)');
      return true;
    } catch (error) {
      console.error('Error sending LINE message:', error);
      return false;
    }
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
