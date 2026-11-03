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

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Not in LINE app
        if (!inClient) {
          if (isMobile) {
            // 📱 Mobile Browser → Redirect to LINE App using liff.openWindow
            const redirected = sessionStorage.getItem('liff_redirected');
            
            if (!redirected) {
              sessionStorage.setItem('liff_redirected', '1');
              console.log('[LiffProvider] Mobile browser detected - redirecting to LINE app');
              
              liff.openWindow({
                url: `https://liff.line.me/${liffId}${window.location.pathname}${window.location.search}`,
                external: false,
              });
              return;
            }
          } else {
            // 💻 Desktop Browser → Show message or redirect to LINE Login
            console.log('[LiffProvider] Desktop browser detected');
            
            // Check if LINE Channel ID is configured for Desktop Login
            const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
            
            if (channelId) {
              // Prevent infinite redirect loop
              const redirected = sessionStorage.getItem('liff_desktop_redirected');
              if (!redirected) {
                sessionStorage.setItem('liff_desktop_redirected', '1');
                console.log('[LiffProvider] Redirecting to LINE Login');
                
                // Use LINE Login OAuth
                const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
                const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(currentUrl)}&state=desktop_liff&scope=profile%20openid`;
                
                window.location.href = lineLoginUrl;
                return;
              }
            } else {
              // No Channel ID - show error message
              setError('กรุณาเปิดผ่าน LINE App บนมือถือ (Desktop browser ไม่รองรับ)');
              console.warn('[LiffProvider] NEXT_PUBLIC_LINE_CHANNEL_ID not configured - Desktop login disabled');
            }
          }
          
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
