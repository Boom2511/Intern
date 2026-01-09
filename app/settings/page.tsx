'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserCog, UploadCloud, ChevronRight, Network } from 'lucide-react';
import { useEffect, useState } from 'react';


export default function SettingsPage() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');
  const [lineQuota, setLineQuota] = useState<{ used: number; quota: number; percentage: number } | null>(null);

  const loadLineQuota = async () => {
    try {
      const response = await fetch('/api/line/quota');
      if (response.ok) {
        const data = await response.json();
        setLineQuota({
          used: data.used,
          quota: data.quota,
          percentage: data.percentage,
        });
      }
    } catch (error) {
      console.error('Failed to load LINE quota:', error);
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadLineQuota();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);


  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left menu */}
        <aside className="md:col-span-1">
          <nav className="space-y-1" aria-label="Settings navigation">
            <nav aria-label="Settings navigation" className="space-y-1">
              <Link href="/settings/users" className={`block px-3 py-2 rounded text-gray-800 ${isActive('/settings/users') ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>
                <span className="inline-flex items-center gap-2"><UserCog className="w-4 h-4" /> User Management</span>
              </Link>
              <Link href="/settings/import/zone-employee" className={`block px-3 py-2 rounded text-gray-800 ${isActive('/settings/import/zone-employee') ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>
                <span className="inline-flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Import: Zone-Employee</span>
              </Link>
              <Link href="/settings/zone-tree" className={`block px-3 py-2 rounded text-gray-800 ${isActive('/settings/zone-tree') ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}>
                <span className="inline-flex items-center gap-2"><Network className="w-4 h-4" /> Zone Organization Tree</span>
              </Link>
            </nav>
          </nav>
        </aside>
        {/* Right content (placeholder) */}
        <section className="md:col-span-3 space-y-4">
          {/* LINE API Quota Bar */}
          {!lineQuota && (
            <Card>
              <CardContent className="py-6 text-sm text-gray-500">
                กำลังโหลด LINE API quota...
              </CardContent>
            </Card>
          )}
          {lineQuota && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">LINE API Quota</h3>
                      <p className="text-xs text-gray-500">{lineQuota.used} / {lineQuota.quota} messages</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{lineQuota.used}/{lineQuota.quota}</div>
                    <div className="text-xs text-gray-500">{lineQuota.percentage}% ใช้ไปแล้ว</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${lineQuota.percentage >= 90 ? 'bg-red-500' :
                      lineQuota.percentage >= 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(lineQuota.percentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
