import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH() {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    error: 'Employee placement is managed in Zone Hierarchy. Reporting relationships are derived from the hierarchy.',
  }, { status: 409 });
}
