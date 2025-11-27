/**
 * LINE API Usage Statistics
 * GET /api/line/usage-stats - แสดงสถิติการใช้งาน LINE API
 */

import { NextResponse } from 'next/server';
import { lineMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get metrics summary
    const summary = lineMetrics.getMetricsSummary();

    // Calculate usage insights
    const insights = [];

    if (summary.totalRequests > 0) {
      insights.push(`Total LINE API requests: ${summary.totalRequests}`);

      if (summary.rateLimitErrors > 0) {
        const errorRate = (summary.rateLimitErrors / summary.totalRequests * 100).toFixed(1);
        insights.push(`❌ 429 Errors: ${summary.rateLimitErrors} (${errorRate}%)`);
      }

      if (summary.retries > 0) {
        const retryRate = (summary.retries / summary.totalRequests * 100).toFixed(1);
        insights.push(`🔄 Retries: ${summary.retries} (${retryRate}%)`);
      }

      if (summary.queueLength > 0) {
        insights.push(`📋 Current queue: ${summary.queueLength} requests`);
      }

      // Estimate monthly quota usage
      // Free tier: 500 messages/month
      // Assume we're using free tier
      const estimatedQuotaUsed = summary.totalRequests - summary.rateLimitErrors;
      const quotaRemaining = Math.max(0, 500 - estimatedQuotaUsed);
      const quotaPercentage = (estimatedQuotaUsed / 500 * 100).toFixed(1);

      insights.push(`\n📊 Estimated Quota Usage (Free Tier):`);
      insights.push(`   Used: ${estimatedQuotaUsed}/500 (${quotaPercentage}%)`);
      insights.push(`   Remaining: ${quotaRemaining} messages`);

      if (quotaPercentage >= 90) {
        insights.push(`   ⚠️ WARNING: Approaching quota limit!`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: summary,
      insights,
      note: 'These metrics reset on each serverless function cold start. For accurate tracking, check Vercel logs or implement database-backed metrics.',
    });
  } catch (error: any) {
    console.error('Error in usage-stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}
