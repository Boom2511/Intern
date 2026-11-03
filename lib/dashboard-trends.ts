import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function getResolutionCounts(where: Prisma.TicketWhereInput) {
  const statusCounts = await prisma.ticket.groupBy({
    by: ['status'],
    _count: true,
    where,
  });

  const countsByStatus = new Map(
    statusCounts.map(({ status, _count }) => [status, _count] as const)
  );

  return {
    solved: (countsByStatus.get('RESOLVED') ?? 0) + (countsByStatus.get('CLOSED') ?? 0),
    unresolved:
      (countsByStatus.get('NEW') ?? 0) +
      (countsByStatus.get('IN_PROGRESS') ?? 0) +
      (countsByStatus.get('PENDING') ?? 0),
  };
}
