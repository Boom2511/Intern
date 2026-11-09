/**
 * Prisma Client Instance
 * Singleton pattern to prevent multiple instances in development
 */

import { PrismaClient } from '@prisma/client';

// ถ้าอยากให้เช็คแค่ว่ามี DATABASE_URL หรือไม่ (เอาการบังคับ localhost ออก)
if (process.env.NODE_ENV === 'development') {
  if (!process.env.DATABASE_URL) {
    throw new Error('Development requires a valid DATABASE_URL in .env.local.');
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;