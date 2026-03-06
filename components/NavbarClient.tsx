/**
 * Navbar Client Component
 * Main navigation bar - receives user data as props from server
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Ticket, Menu, UserCog, LogOut, User, FlaskConical, FileText, Settings, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SessionUser } from '@/lib/auth';

interface NavbarClientProps {
  currentUser: SessionUser | null;
}

export default function NavbarClient({ currentUser }: NavbarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  // Hide navbar for client mode
  if (mode === 'client') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'ADMIN': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'OPERATOR': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'USER': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'Administrator';
      case 'ADMIN': return 'Admin';
      case 'OPERATOR': return 'Operator';
      case 'USER': return 'User';
      default: return role;
    }
  };

  const canAccessUserManagement = currentUser && (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'ADMIN');
  const canAccessTestPages = currentUser && currentUser.role === 'ADMINISTRATOR';
  const isUserRole = currentUser && currentUser.role === 'USER';

  return (
    <nav className="bg-blue-600 shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" prefetch={false} className="flex items-center space-x-2 font-bold text-xl text-white hover:text-blue-100 transition">
            <Ticket className="h-6 w-6 text-white" />
            <span className="text-white">PostServe</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {/* USER role - show dashboard and tickets */}
            {isUserRole ? (
              <>
                <Link
                  href="/user/dashboard"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <LayoutDashboard className="h-4 w-4 text-white" />
                  <span className="text-white">Dashboard</span>
                </Link>
                <Link
                  href="/user/tickets"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <Ticket className="h-4 w-4 text-white" />
                  <span className="text-white">Tickets</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <LayoutDashboard className="h-4 w-4 text-white" />
                  <span className="text-white">Dashboard</span>
                </Link>
                <Link
                  href="/tickets"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <Ticket className="h-4 w-4 text-white" />
                  <span className="text-white">Tickets</span>
                </Link>
                <Link
                  href="/reports"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <FileText className="h-4 w-4 text-white" />
                  <span className="text-white">Reports</span>
                </Link>

                {/* User Management - Only for ADMIN and ADMINISTRATOR */}
                {canAccessUserManagement && (
                  <Link
                    href="/settings"
                    className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                  >
                    <Settings className="h-4 w-4 text-white" />
                    <span className="text-white">Settings</span>
                  </Link>
                )}

                <Link
                  href="/tickets/new"
                  className="
    inline-flex items-center gap-2
    bg-white/95 hover:bg-white
    text-blue-600
    px-4 py-2
    rounded-lg
    font-semibold text-sm
    shadow-sm hover:shadow
    transition-all duration-200
    active:scale-[0.98]
  "
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline">สร้าง Ticket ใหม่</span>
                  <span className="lg:hidden">Ticket</span>
                </Link>
              </>
            )}

            {/* User Info and Logout */}
            {currentUser && (
              <div className="flex items-center space-x-3 ml-2 pl-3 border-l border-blue-400">
                <div className="flex items-center space-x-2 min-w-0">
                  <User className="h-4 w-4 text-white shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-white text-sm font-medium truncate max-w-[120px]"
                      title={currentUser.name}
                    >
                      {currentUser.name}
                    </span>

                    <Badge className="text-xs shrink-0">
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4 text-white" />
                  <span className="text-white text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {!isUserRole && (
              <Link
                href="/tickets/new"
                className="bg-white text-blue-600 hover:bg-gray-100 p-2 rounded-md transition"
                title="สร้าง Ticket ใหม่"
              >
                <Plus className="h-5 w-5" />
              </Link>
            )}
            <button type="button" className="text-white" title="เมนู">
              <Menu className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
