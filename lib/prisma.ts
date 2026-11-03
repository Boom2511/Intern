/**
 * Prisma Client Instance
 * Singleton pattern to prevent multiple instances in development
 *
 * This ensures we don't create multiple database connections during hot reload
 * Configured for serverless/edge environments (Vercel, Supabase)
 */

import { PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'development') {
  const databaseUrl = process.env.DATABASE_URL;

  let localDatabase: URL;
  try {
    localDatabase = new URL(databaseUrl || '');
  } catch {
    throw new Error('Development requires a valid local DATABASE_URL in .env.local.');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const databaseName = localDatabase.pathname.replace(/^\/+/, '');

  if (
    !['postgres:', 'postgresql:'].includes(localDatabase.protocol) ||
    !localHosts.has(localDatabase.hostname) ||
    localDatabase.port !== '5432' ||
    databaseName !== 'helpdesk_local'
  ) {
    throw new Error('Development DATABASE_URL must target localhost:5432/helpdesk_local.');
  }
}

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
