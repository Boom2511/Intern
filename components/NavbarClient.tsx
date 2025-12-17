/**
 * Navbar Client Component
 * Main navigation bar - receives user data as props from server
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Ticket, Menu, UserCog, LogOut, User, FlaskConical, FileText } from 'lucide-react';
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'Administrator';
      case 'ADMIN': return 'Admin';
      case 'OPERATOR': return 'Operator';
      default: return role;
    }
  };

  const canAccessUserManagement = currentUser && (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'ADMIN');
  const canAccessTestPages = currentUser && currentUser.role === 'ADMINISTRATOR';

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" prefetch={false} className="flex items-center space-x-1 font-bold text-lg text-white hover:text-blue-100 transition flex-shrink-0">
            <Ticket className="h-5 w-5 text-white" />
            <span className="text-white">PostServe</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-4 overflow-visible">
            {/* Left Side - Main Navigation */}
            <div className="flex items-center gap-1 flex-wrap">
              <Link
                href="/dashboard"
                className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-2 rounded-md transition text-sm whitespace-nowrap"
              >
                <LayoutDashboard className="h-4 w-4 text-white" />
                <span className="text-white">Dashboard</span>
              </Link>
              <Link
                href="/tickets"
                className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-2 rounded-md transition text-sm whitespace-nowrap"
              >
                <Ticket className="h-4 w-4 text-white" />
                <span className="text-white">Tickets</span>
              </Link>
              <Link
                href="/reports"
                className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-2 rounded-md transition text-sm whitespace-nowrap"
              >
                <FileText className="h-4 w-4 text-white" />
                <span className="text-white">Reports</span>
              </Link>

              {/* User Management - Only for ADMIN and ADMINISTRATOR */}
              {canAccessUserManagement && (
                <Link
                  href="/staff"
                  className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-2 rounded-md transition text-sm whitespace-nowrap"
                >
                  <UserCog className="h-4 w-4 text-white" />
                  <span className="text-white">Staff</span>
                </Link>
              )}

              {/* Test Pages - Only for ADMINISTRATOR */}
              {canAccessTestPages && (
                <Link
                  href="/test-flex"
                  className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-2 rounded-md transition text-sm whitespace-nowrap"
                >
                  <FlaskConical className="h-4 w-4 text-white" />
                  <span className="text-white">Test</span>
                </Link>
              )}
            </div>

            {/* Right Side - Actions & User */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Link
                href="/tickets/new"
                className="bg-white text-blue-600 hover:bg-gray-100 px-3 py-1.5 rounded-md font-medium transition text-sm whitespace-nowrap"
              >
                สร้าง Ticket
              </Link>

              {/* User Info and Logout */}
              {currentUser && (
                <div className="flex items-center space-x-2 pl-2 border-l border-blue-400">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4 text-white" />
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-medium">{currentUser.name}</span>
                      <Badge className={`${getRoleBadgeColor(currentUser.role)} text-xs py-0 px-1`}>
                        {getRoleLabel(currentUser.role)}
                      </Badge>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-white hover:bg-blue-700 px-2 py-1.5 rounded-md transition"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="h-4 w-4 text-white" />
                    <span className="text-white text-xs">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button type="button" className="md:hidden text-white" aria-label="Toggle menu">
            <Menu className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </nav>
  );
}
