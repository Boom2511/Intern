/**
 * EMS Calculator Button
 * ปุ่มสำหรับเปิด EMS Calculator
 */

'use client';

import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEMSCalculator } from '@/contexts/EMSCalculatorContext';

interface EMSCalculatorButtonProps {
  mode?: 'model' | 'weight';
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function EMSCalculatorButton({
  mode = 'weight',
  variant = 'outline',
  size = 'default',
  className,
  children,
}: EMSCalculatorButtonProps) {
  const { openCalculator } = useEMSCalculator();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => openCalculator(mode)}
      className={className}
    >
      <Calculator className="w-4 h-4 mr-2" />
      {children || 'คำนวณ EMS'}
    </Button>
  );
}
