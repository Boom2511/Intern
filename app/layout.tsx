/**
 * Root Layout
 * Main layout wrapper for the entire application
 * Fetches user once on server and provides via Context
 */

import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/providers/UserProvider';
import { getCurrentUser } from '@/lib/auth';
import { Suspense } from 'react';
import SWRBoundary from '@/providers/SWRBoundary';
import { EMSCalculatorProvider } from '@/contexts/EMSCalculatorContext';
import { EMSCalculatorGlobal } from '@/components/ems-jumbo';

export const metadata: Metadata = {
  title: 'PostServe - Help Desk System',
  description: 'ระบบจัดการ Ticket สำหรับ PostServe',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user once on server side
  const user = await getCurrentUser();

  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50">
        <UserProvider user={user}>
          <EMSCalculatorProvider>
            <Suspense fallback={null}>
              <ConditionalNavbar />
            </Suspense>
            <main className="container mx-auto px-4 pt-24 pb-8">
              <SWRBoundary>{children}</SWRBoundary>
            </main>
            <Toaster />
            <EMSCalculatorGlobal />
          </EMSCalculatorProvider>
        </UserProvider>
      </body>
    </html>
  );
}
