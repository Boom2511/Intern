/**
 * LIFF Initialization Hook
 * Handles LIFF SDK initialization and authentication
 */

import { useState, useEffect, useRef } from 'react';
import liff from '@line/liff';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface UseLiffOptions {
  onReady?: (profile: LineProfile | null) => void;
  onError?: (error: string) => void;
}

export function useLiff(options?: UseLiffOptions) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const loginAttempted = useRef(false);

  useEffect(() => {
    // Run only once
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

        // Check for invalid URL (with liff.state parameter)
        if (window.location.search.includes('liff.state')) {
          const err = 'URL ไม่ถูกต้อง กรุณาเปิดจาก LINE message ใหม่';
          setError(err);
          options?.onError?.(err);
          return;
        }

        if (!liffId) {
          // No LIFF ID - load as anonymous
          setIsReady(true);
          options?.onReady?.(null);
          return;
        }

        // Initialize LIFF
        await liff.init({ liffId });

        // Not in LINE app - load as read-only
        if (!liff.isInClient()) {
          setIsReady(true);
          options?.onReady?.(null);
          return;
        }

        // Not logged in - trigger login
        if (!liff.isLoggedIn()) {
          if (loginAttempted.current) {
            // Prevent login loop
            setIsReady(true);
            options?.onReady?.(null);
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
        setIsReady(true);
        options?.onReady?.(userProfile);
      } catch (err: any) {
        const errorMsg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE';
        setError(errorMsg);
        setIsReady(true);
        options?.onError?.(errorMsg);
      }
    };

    init();
  }, []);

  return {
    isReady,
    profile,
    error,
    isInClient: isReady && liff.isInClient?.() || false,
    isLoggedIn: isReady && liff.isLoggedIn?.() || false,
  };
}
