/**
 * Conditional Navbar Component
 * Shows or hides navbar based on URL parameters (mode=client) and pathname
 */

'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const mode = searchParams.get('mode');

  // Hide navbar for client mode
  if (mode === 'client') {
    return null;
  }

  // Hide navbar on login page
  if (pathname === '/login') {
    return null;
  }

  // Hide navbar for all LIFF pages (LINE Front-end Framework)
  if (pathname?.startsWith('/liff')) {
    return null;
  }

  return <Navbar />;
}
