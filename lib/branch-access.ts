import { Prisma } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';

export function getTicketBranchScope(
  user: Pick<SessionUser, 'branchId' | 'isSuperAdmin'>
): Prisma.TicketWhereInput | null {
  if (user.isSuperAdmin) return {};
  if (user.branchId === null) return null;
  return { branchId: user.branchId };
}

export function getReportBranchScope(
  user: Pick<SessionUser, 'branchId' | 'isSuperAdmin'>,
  requestedBranchId?: number | string | null,
): Prisma.TicketWhereInput | null {
  if (user.isSuperAdmin) {
    const branchId = Number(requestedBranchId);
    return Number.isInteger(branchId) && branchId > 0 ? { branchId } : null;
  }
  if (user.branchId === null) return null;
  if (requestedBranchId !== undefined && requestedBranchId !== null &&
      Number(requestedBranchId) !== user.branchId) return null;
  return { branchId: user.branchId };
}

export function canAccessBranch(
  user: Pick<SessionUser, 'branchId' | 'isSuperAdmin'>,
  branchId: number | null
): boolean {
  return user.isSuperAdmin || (user.branchId !== null && user.branchId === branchId);
}
