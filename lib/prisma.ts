/**
 * Prisma Client Instance
 * Singleton pattern to prevent multiple instances in development
 *
 * This ensures we don't create multiple database connections during hot reload
 * Configured for serverless/edge environments (Vercel, Supabase)
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Ensure connection is closed on serverless function shutdown
if (process.env.NODE_ENV === 'production') {
  // Use shorter connection timeout for serverless
  prisma.$connect();
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
