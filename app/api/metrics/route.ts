/**
 * Metrics API Endpoint
 * Exposes Prometheus metrics for monitoring
 * GET /api/metrics - Get Prometheus-formatted metrics
 * GET /api/metrics?format=json - Get JSON summary of metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { lineMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics
 * Query params:
 * - format: 'prometheus' (default) or 'json'
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization');
    const metricsSecret = process.env.METRICS_SECRET;

    if (metricsSecret && authHeader !== `Bearer ${metricsSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'prometheus';

    if (format === 'json') {
      // Return JSON summary for dashboards
      const summary = lineMetrics.getMetricsSummary();

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        metrics: summary,
      });
    } else {
      // Return Prometheus-formatted metrics
      const prometheusMetrics = await lineMetrics.getMetrics();

      return new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
