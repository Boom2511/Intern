'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

import dynamic from 'next/dynamic';

const StaffPage = dynamic(() => import('@/app/staff/page'), { ssr: false });

export default function SettingsUsersPage() {
  return (
    <div className="space-y-2">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><Link href="/settings" className="hover:underline">Settings</Link></li>
          <li><span className="px-1">/</span></li>
          <li className="text-gray-700">User Management</li>
        </ol>
      </nav>
      <StaffPage />
    </div>
  );
}
