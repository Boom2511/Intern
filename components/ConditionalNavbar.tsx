/**
 * Conditional Navbar Component
 * Shows or hides navbar based on URL parameters (mode=client) and pathname
 * Server component that fetches user data and passes to client Navbar
 */

import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import NavbarClient from './NavbarClient';

export default async function ConditionalNavbar() {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // Hide navbar on login page
  if (pathname === '/login') {
    return null;
  }

  // Hide navbar for all LIFF pages (LINE Front-end Framework)
  if (pathname?.startsWith('/liff')) {
    return null;
  }

  // Fetch user data on server side
  const currentUser = await getCurrentUser();

  return <NavbarClient currentUser={currentUser} />;
}
