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

// Optimize for serverless environment
if (process.env.NODE_ENV === 'production') {
  // Don't call $connect() here - let Prisma connect lazily on first query
  // This prevents connection exhaustion in serverless environments
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
