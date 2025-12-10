/**
 * Home Page
 * Handles LIFF redirect if liff.state is present
 * Otherwise shows landing page with overview and quick actions
 */

'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket, LayoutDashboard, Plus, Search } from 'lucide-react';
import VConsole from '@/components/VConsole';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only run once on mount to prevent redirect loops
    const liffState = searchParams.get('liff.state');
    const currentPath = window.location.pathname;

    console.log('[Root] Mounted. Checking for LIFF redirect...');
    console.log('[Root] Current pathname:', currentPath);
    console.log('[Root] liff.state:', liffState);
    console.log('[Root] All search params:', Object.fromEntries(searchParams.entries()));

    // Skip redirect if:
    // 1. No liff.state parameter
    // 2. Already at the target path (prevent loop)
    // 3. Not at root path (prevent interfering with other pages)
    if (!liffState || currentPath === liffState || currentPath !== '/') {
      console.log('[Root] Skipping redirect:', {
        hasLiffState: !!liffState,
        currentPath,
        liffState,
        isRoot: currentPath === '/'
      });
      return;
    }

    // Check if we've already redirected to this liff.state (compare path only, ignore query params)
    const liffPath = liffState.split('?')[0]; // Remove query params like ?liff.hback=2
    const lastRedirect = sessionStorage.getItem('last_liff_redirect');

    // If we're still at root (/) but sessionStorage says we redirected, it means redirect failed
    // Clear sessionStorage and try again
    if (lastRedirect === liffPath && currentPath === '/') {
      console.log('[Root] ⚠️ SessionStorage shows redirect to:', lastRedirect);
      console.log('[Root] But we are still at root (/), so previous redirect failed');
      console.log('[Root] Clearing sessionStorage and retrying...');
      sessionStorage.removeItem('last_liff_redirect');
      // Don't return, let it continue to redirect below
    } else if (lastRedirect === liffPath) {
      // If we're not at root but have matching redirect, we're in a loop
      console.log('[Root] ⛔ Already redirected to this path, skipping to prevent loop');
      console.log('[Root] Last redirect:', lastRedirect);
      console.log('[Root] Current path:', liffPath);
      return;
    }

    setIsRedirecting(true);
    console.log('[Root] ⚡ Redirecting to LIFF state:', liffState);
    console.log('[Root] Path (without query):', liffPath);

    // Mark this redirect in sessionStorage (path only, without query params)
    sessionStorage.setItem('last_liff_redirect', liffPath);

    // Use window.location.replace for LINE WebView compatibility
    // router.replace() doesn't work in LINE's embedded browser
    console.log('[Root] Using window.location.replace for LINE WebView');
    setTimeout(() => {
      window.location.replace(liffState);
    }, 500); // Small delay to ensure visual feedback is visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visual debugging - show liff.state info
  const liffStateDebug = searchParams.get('liff.state');
  const showDebug = !!liffStateDebug;

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-100 p-4">
        <div className="text-center max-w-md bg-white p-6 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-bold text-lg mb-4">✅ กำลังเปลี่ยนเส้นทาง...</p>
          {showDebug && (
            <div className="bg-green-50 p-4 rounded-lg text-left text-sm space-y-2">
              <p className="text-gray-700"><strong>Redirecting to:</strong></p>
              <p className="font-mono text-xs text-green-700 break-all bg-white p-2 rounded">
                {liffStateDebug}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show warning if liff.state is present but not redirecting
  if (showDebug) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    const handleRetryRedirect = () => {
      console.log('[Root] 🔄 User requested retry, clearing sessionStorage...');
      sessionStorage.removeItem('last_liff_redirect');
      console.log('[Root] Reloading page to retry redirect...');
      window.location.reload();
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 p-4">
        <div className="max-w-lg bg-white p-6 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ LIFF Redirect Failed!</h1>
          <div className="space-y-3 text-sm bg-red-50 p-4 rounded-lg">
            <div>
              <strong className="text-gray-700">liff.state:</strong>
              <p className="font-mono text-xs text-red-700 break-all bg-white p-2 rounded mt-1">
                {liffStateDebug}
              </p>
            </div>
            <div>
              <strong className="text-gray-700">Current path:</strong>
              <p className="font-mono text-xs bg-white p-2 rounded mt-1">{currentPath}</p>
            </div>
            <div>
              <strong className="text-gray-700">sessionStorage check:</strong>
              <p className="font-mono text-xs bg-white p-2 rounded mt-1">
                {typeof window !== 'undefined' ? sessionStorage.getItem('last_liff_redirect') || '(empty)' : 'loading...'}
              </p>
            </div>
            <p className="text-red-600 font-semibold mt-4 pt-4 border-t border-red-200">
              ❌ หน้านี้ควรจะ redirect ไปที่ <span className="font-mono text-xs">{liffStateDebug}</span> แต่ไม่ redirect!
            </p>
            <p className="text-gray-600 text-xs mt-2">
              มีปัญหา: sessionStorage บล็อก redirect เพราะเคยพยายาม redirect ไปที่นี่แล้ว
            </p>
          </div>

          <button
            type="button"
            onClick={handleRetryRedirect}
            className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            🔄 ลองใหม่อีกครั้ง (Clear Cache & Retry)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900">
          ยินดีต้อนรับสู่ระบบ Help Desk
        </h1>
        <p className="text-xl text-gray-600">
          ไปรษณีย์ไทย - ระบบจัดการคำร้องและปัญหาจากลูกค้า
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/tickets/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              สร้าง Ticket ใหม่
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="outline" size="lg">
              <Search className="h-5 w-5 mr-2" />
              ค้นหา Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <LayoutDashboard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>ภาพรวมสถิติและรายงาน</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ดูสถิติ Tickets, สถานะการทำงาน และรายงานสรุป
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tickets">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Ticket className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Tickets</CardTitle>
                  <CardDescription>จัดการ Tickets ทั้งหมด</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ดู ค้นหา และจัดการ Tickets ที่สร้างในระบบ
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Quick Start */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">เริ่มต้นอย่างรวดเร็ว</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
              <li>คลิก “สร้าง Ticket ใหม่”</li>
              <li>กรอกข้อมูลลูกค้าและปัญหา</li>
              <li>ตั้งระดับความสำคัญ (Priority)</li>
              <li>มอบหมายเจ้าหน้าที่รับผิดชอบ</li>
              <li>ติดตามงานที่ Dashboard</li>
            </ol>
          </CardContent>
        </Card>

        {/* Daily Checklist */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900">สิ่งที่ต้องตรวจทุกวัน</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-2">
              <li>Tickets ที่ยังไม่ได้รับมอบหมาย</li>
              <li>Tickets ค้างเกิน 24 ชั่วโมง</li>
              <li>Tickets ใกล้ครบกำหนด (SLA)</li>
              <li>อัปเดตใหม่จากเจ้าหน้าที่</li>
              <li>Tickets ที่ต้องปิดวันนี้</li>
            </ul>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">ตัวชี้วัดสำคัญ (Key Metrics)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-purple-800 space-y-2">
              <li>จำนวน Tickets เปิดใหม่วันนี้</li>
              <li>Tickets ที่กำลังดำเนินการ</li>
              <li>Tickets ที่เสร็จแล้ว</li>
              <li>Tickets ค้างเกิน SLA</li>
              <li>เวลาตอบรับเฉลี่ย (Response Time)</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <VConsole />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </>
  );
}
