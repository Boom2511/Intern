import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Permission, hasPermission } from '@/lib/auth';
import TestFlexClient from './TestFlexClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TestFlexPage() {
  const currentUser = await getCurrentUser();

  // Check if user has permission to view test pages
  if (!currentUser || !hasPermission(currentUser.role, Permission.VIEW_TEST_PAGES)) {
    redirect('/dashboard');
  }

  return <TestFlexClient />;
}
