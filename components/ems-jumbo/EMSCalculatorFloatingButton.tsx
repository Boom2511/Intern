/**
 * EMS Calculator Floating Button
 * ปุ่มลอยที่มุมหน้าจอสำหรับเปิด Calculator
 */

'use client';

import { Calculator } from 'lucide-react';
import { useEMSCalculator } from '@/contexts/EMSCalculatorContext';

interface EMSCalculatorFloatingButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function EMSCalculatorFloatingButton({ 
  position = 'bottom-right' 
}: EMSCalculatorFloatingButtonProps) {
  const { openCalculator } = useEMSCalculator();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <button
      onClick={() => openCalculator('weight')}
      className={`
        fixed ${positionClasses[position]} z-40
        bg-blue-600 hover:bg-blue-700 text-white
        rounded-full p-4 shadow-lg
        transition-all duration-200
        hover:scale-110 active:scale-95
        group
      `}
      title="คำนวณราคา EMS Jumbo"
    >
      <Calculator className="w-6 h-6" />
      
      {/* Tooltip */}
      <span className="
        absolute right-full mr-3 top-1/2 -translate-y-1/2
        bg-gray-900 text-white text-sm
        px-3 py-1 rounded whitespace-nowrap
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
      ">
        คำนวณ EMS Jumbo
      </span>
    </button>
  );
}
