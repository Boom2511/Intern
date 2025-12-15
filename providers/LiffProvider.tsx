/**
 * LIFF Provider
 * Shared LIFF initialization context to avoid multiple inits
 */

'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import liff from '@line/liff';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface LiffContextType {
  isReady: boolean;
  profile: LineProfile | null;
  error: string | null;
  isInClient: boolean;
  isLoggedIn: boolean;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  profile: null,
  error: null,
  isInClient: false,
  isLoggedIn: false,
});

export function useLiffContext() {
  return useContext(LiffContext);
}

interface LiffProviderProps {
  children: ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInClient, setIsInClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const initialized = useRef(false);
  const loginAttempted = useRef(false);

  useEffect(() => {
    // Run only once per app lifecycle
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

        // Check for invalid URL (with liff.state parameter)
        if (window.location.search.includes('liff.state')) {
          const err = 'URL ไม่ถูกต้อง กรุณาเปิดจาก LINE message ใหม่';
          setError(err);
          setIsReady(true);
          return;
        }

        if (!liffId) {
          // No LIFF ID - load as anonymous
          setIsReady(true);
          return;
        }

        // Initialize LIFF once
        await liff.init({ liffId });

        // Check if in LINE app
        const inClient = liff.isInClient();
        setIsInClient(inClient);

        // Not in LINE app - load as read-only
        if (!inClient) {
          setIsReady(true);
          return;
        }

        // Check login status
        const loggedIn = liff.isLoggedIn();
        setIsLoggedIn(loggedIn);

        // Not logged in - trigger login
        if (!loggedIn) {
          if (loginAttempted.current) {
            // Prevent login loop
            setIsReady(true);
            return;
          }

          loginAttempted.current = true;
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;

          // Small delay for logs
          await new Promise(resolve => setTimeout(resolve, 300));
          liff.login({ redirectUri: cleanUrl });
          return;
        }

        // Get profile
        const userProfile = await liff.getProfile();
        setProfile(userProfile);
        setIsLoggedIn(true);
        setIsReady(true);
      } catch (err: any) {
        const errorMsg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE';
        setError(errorMsg);
        setIsReady(true);
      }
    };

    init();
  }, []);

  return (
    <LiffContext.Provider value={{ isReady, profile, error, isInClient, isLoggedIn }}>
      {children}
    </LiffContext.Provider>
  );
}
