'use client';

import { useEffect } from 'react';

/**
 * VConsole Component
 * Loads VConsole for mobile debugging in LINE app
 * Only loads in production when needed for LIFF debugging
 */
export default function VConsole() {
  useEffect(() => {
    // Only load VConsole in browser environment
    if (typeof window === 'undefined') return;

    // Load VConsole dynamically
    import('vconsole').then((module) => {
      const VConsole = module.default;
      const vConsole = new VConsole({
        theme: 'dark',
        defaultPlugins: ['system', 'network', 'element', 'storage'],
        maxLogNumber: 1000,
      });

      console.log('[VConsole] ✅ VConsole initialized');

      // Cleanup on unmount
      return () => {
        vConsole.destroy();
      };
    }).catch((error) => {
      console.error('[VConsole] Failed to load:', error);
    });
  }, []);

  return null; // No UI, just loads VConsole
}
