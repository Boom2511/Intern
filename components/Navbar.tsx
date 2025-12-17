/**
 * Navbar Component
 * Main navigation bar for the application
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Ticket, Menu, UserCog, LogOut, User, FlaskConical, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR';
  isActive: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const canAccessUserManagement = mounted && currentUser && (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'ADMIN');
  const canAccessTestPages = mounted && currentUser && currentUser.role === 'ADMINISTRATOR';

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" prefetch={false} className="flex items-center space-x-2 font-bold text-xl text-white hover:text-blue-100 transition">
            <Ticket className="h-6 w-6 text-white" />
            <span className="text-white">PostServe</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-8">
            {/* Left Side - Main Navigation */}
            <div className="flex items-center space-x-2">
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
                  href="/staff"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <UserCog className="h-4 w-4 text-white" />
                  <span className="text-white">User Management</span>
                </Link>
              )}

              {/* Test Pages - Only for ADMINISTRATOR */}
              {canAccessTestPages && (
                <Link
                  href="/test-flex"
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                >
                  <FlaskConical className="h-4 w-4 text-white" />
                  <span className="text-white">Test</span>
                </Link>
              )}
            </div>

            {/* Right Side - Actions & User */}
            <div className="flex items-center space-x-3">
              <Link
                href="/tickets/new"
                className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition"
              >
                สร้าง Ticket ใหม่
              </Link>

              {/* User Info and Logout */}
              {mounted && !loading && currentUser && (
                <div className="flex items-center space-x-3 pl-3 border-l border-blue-400">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-white" />
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium">{currentUser.name}</span>
                      <Badge className={`${getRoleBadgeColor(currentUser.role)} text-xs py-0 px-1.5`}>
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
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-white" />
              <span className="text-white">Dashboard</span>
            </Link>
            <Link
              href="/tickets"
              className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Ticket className="h-4 w-4 text-white" />
              <span className="text-white">Tickets</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText className="h-4 w-4 text-white" />
              <span className="text-white">Reports</span>
            </Link>

            {canAccessUserManagement && (
              <Link
                href="/staff"
                className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserCog className="h-4 w-4 text-white" />
                <span className="text-white">User Management</span>
              </Link>
            )}

            {canAccessTestPages && (
              <Link
                href="/test-flex"
                className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FlaskConical className="h-4 w-4 text-white" />
                <span className="text-white">Test</span>
              </Link>
            )}

            <Link
              href="/tickets/new"
              className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition block text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              สร้าง Ticket ใหม่
            </Link>

            {mounted && !loading && currentUser && (
              <div className="pt-2 border-t border-blue-400 mt-2">
                <div className="flex items-center space-x-2 px-3 py-2">
                  <User className="h-4 w-4 text-white" />
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">{currentUser.name}</span>
                    <Badge className={`${getRoleBadgeColor(currentUser.role)} text-xs py-0 px-1.5 w-fit`}>
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition w-full"
                >
                  <LogOut className="h-4 w-4 text-white" />
                  <span className="text-white text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
