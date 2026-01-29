/**
 * User Provider
 * Provides authenticated user context to all pages
 * Fetched once on server, shared via Context
 * Includes session validation to handle expired sessions
 */

'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import type { SessionUser } from '@/lib/auth';
import { needsSessionCheck, verifySession } from '@/lib/session-storage';
import { usePathname, useRouter } from 'next/navigation';

interface UserContextType {
  user: SessionUser | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
});

export function useUser() {
  return useContext(UserContext);
}

interface UserProviderProps {
  user: SessionUser | null;
  children: ReactNode;
}

export function UserProvider({ user, children }: UserProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip session check for public routes
    const publicRoutes = ['/login', '/liff'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute || !user) {
      return;
    }

    // Check if session verification is needed
    if (!needsSessionCheck()) {
      return;
    }

    // Verify session with server (debounced to prevent multiple checks)
    let mounted = true;
    const checkSession = async () => {
      const isValid = await verifySession();

      if (!mounted) return; // Component unmounted, skip redirect

      if (!isValid) {
        // Session expired - redirect to login
        console.log('[Session] Session expired, redirecting to login');
        router.push(`/login?redirect=${pathname}&reason=expired`);
      }
    };

    // Small delay to prevent race condition on initial load
    const timer = setTimeout(checkSession, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [user, pathname, router]);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}
