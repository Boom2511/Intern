/**
 * Conditional Navbar Component
 * Shows or hides navbar based on URL parameters (mode=client)
 */

'use client';

import { useSearchParams } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  // Hide navbar for client mode
  if (mode === 'client') {
    return null;
  }

  return <Navbar />;
}
