/**
 * EMS Calculator Global Component
 * Component ที่ render floating panel ใน root layout
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEMSCalculator } from '@/contexts/EMSCalculatorContext';
import { EMSJumboCalculator } from './EMSJumboCalculator';
import { EMSCalculatorFloatingButton } from './EMSCalculatorFloatingButton';

export function EMSCalculatorGlobal() {
  const pathname = usePathname();
  const { isOpen, initialMode, closeCalculator } = useEMSCalculator();

  // Don't show on LIFF pages
  if (pathname?.startsWith('/liff')) {
    return null;
  }

  return (
    <>
      <EMSCalculatorFloatingButton position="bottom-right" />
      <EMSJumboCalculator
        isOpen={isOpen}
        onClose={closeCalculator}
        initialMode={initialMode}
      />
    </>
  );
}
