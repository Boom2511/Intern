/**
 * Navbar Component
 * Main navigation bar for the application
 */

import Link from 'next/link';
import { LayoutDashboard, Ticket, Menu, UserCog } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-white hover:text-blue-100 transition">
            <Ticket className="h-6 w-6 text-white" />
            <span className="text-white">Help Desk - ไปรษณีย์ไทย</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
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
              href="/staff"
              className="flex items-center space-x-2 text-white hover:bg-blue-700 px-3 py-2 rounded-md transition"
            >
              <UserCog className="h-4 w-4 text-white" />
              <span className="text-white">Staff</span>
            </Link>
            <Link
              href="/tickets/new"
              className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition"
            >
              สร้าง Ticket ใหม่
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white">
            <Menu className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </nav>
  );
}
