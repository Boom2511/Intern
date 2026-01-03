'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const ZoneEmployeeImportPage = dynamic(() => import('@/app/import/zone-employee/page'), { ssr: false });

export default function SettingsImportZoneEmployeePage() {
  return (
    <div className="space-y-2">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><Link href="/settings" className="hover:underline">Settings</Link></li>
          <li><span className="px-1">/</span></li>
          <li className="text-gray-700">Import: Zone-Employee</li>
        </ol>
      </nav>
      <ZoneEmployeeImportPage />
    </div>
  );
}
