'use client';

import { useState } from 'react';
import { quickAnswerTemplates, type QuickAnswerTemplate } from '@/config/quick-answers';

interface QuickAnswerButtonsProps {
  onSelectAnswer: (template: QuickAnswerTemplate) => void;
}

export default function QuickAnswerButtons({ onSelectAnswer }: QuickAnswerButtonsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleSelect = (template: QuickAnswerTemplate) => {
    setActiveId(template.id);
    onSelectAnswer(template);
  };

  return (
    <div className="space-y-3">    
      <div className="flex flex-wrap gap-2">
        {quickAnswerTemplates.map((template) => {
          const isActive = activeId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              className={`
                px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 shadow-sm
                ${isActive 
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-100' // เมื่อเลือก: พื้นหลังน้ำเงิน ตัวหนังสือขาว
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50' // ปกติ
                }
              `}
            >
              {template.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}