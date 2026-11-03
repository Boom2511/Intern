/**
 * EMS Calculator Context
 * Context สำหรับจัดการ state ของ EMS Calculator ทั้งแอป
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type CalculationMode = 'model' | 'weight';

interface EMSCalculatorContextType {
  isOpen: boolean;
  initialMode: CalculationMode;
  openCalculator: (mode?: CalculationMode) => void;
  closeCalculator: () => void;
}

const EMSCalculatorContext = createContext<EMSCalculatorContextType | undefined>(undefined);

export function EMSCalculatorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<CalculationMode>('weight');

  const openCalculator = (mode: CalculationMode = 'weight') => {
    setInitialMode(mode);
    setIsOpen(true);
  };

  const closeCalculator = () => {
    setIsOpen(false);
  };

  return (
    <EMSCalculatorContext.Provider
      value={{
        isOpen,
        initialMode,
        openCalculator,
        closeCalculator,
      }}
    >
      {children}
    </EMSCalculatorContext.Provider>
  );
}

export function useEMSCalculator() {
  const context = useContext(EMSCalculatorContext);
  if (context === undefined) {
    throw new Error('useEMSCalculator must be used within EMSCalculatorProvider');
  }
  return context;
}
