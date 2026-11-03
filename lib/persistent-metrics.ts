/**
 * Persistent Metrics for Serverless Environments
 * Stores metrics in database to survive cold starts
 */

import { prisma } from './prisma';

export interface MetricEntry {
  timestamp: Date;
  endpoint: string;
  status: number;
  duration: number;
  attempt: number;
  isRetry: boolean;
  errorType?: string;
}

/**
 * Log a LINE API request to database
 */
export async function logLineApiMetric(entry: MetricEntry): Promise<void> {
  try {
    // You would need to create a Prisma model for this
    // For now, just log to console as fallback
    console.log('[Persistent Metric]', JSON.stringify(entry));

    // Example: If you add a LineApiLog model to your schema
    // await prisma.lineApiLog.create({
    //   data: {
    //     timestamp: entry.timestamp,
    //     endpoint: entry.endpoint,
    //     status: entry.status,
    //     duration: entry.duration,
    //     attempt: entry.attempt,
    //     isRetry: entry.isRetry,
    //     errorType: entry.errorType,
    //   },
    // });
  } catch (error) {
    console.error('Failed to log metric:', error);
  }
}

/**
 * Get metrics summary from database
 */
export async function getMetricsSummary(
  startDate: Date,
  endDate: Date = new Date()
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  rateLimitErrors: number;
  retries: number;
  averageDuration: number;
}> {
  try {
    // Example implementation - would need actual schema
    // const logs = await prisma.lineApiLog.findMany({
    //   where: {
    //     timestamp: {
    //       gte: startDate,
    //       lte: endDate,
    //     },
    //   },
    // });

    // For now, return zeros
    return {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitErrors: 0,
      retries: 0,
      averageDuration: 0,
    };
  } catch (error) {
    console.error('Failed to get metrics summary:', error);
    throw error;
  }
}
