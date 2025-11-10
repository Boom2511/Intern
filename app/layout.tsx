/**
 * Root Layout
 * Main layout wrapper for the entire application
 */

import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Help Desk - ไปรษณีย์ไทย',
  description: 'ระบบจัดการ Ticket สำหรับไปรษณีย์ไทย',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50">
        <Suspense fallback={null}>
          <ConditionalNavbar />
        </Suspense>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
