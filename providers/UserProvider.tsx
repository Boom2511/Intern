/**
 * User Provider
 * Provides authenticated user context to all pages
 * Fetched once on server, shared via Context
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { SessionUser } from '@/lib/auth';

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
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}
