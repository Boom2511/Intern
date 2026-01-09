'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';

interface ImportProgressModalProps {
  open: boolean;
  importing: boolean;
  progress: number;
  phase: string;
  message: string;
  success: boolean;
  onCancel: () => void;
  onClose: () => void;
}

export function ImportProgressModal({
  open,
  importing,
  progress,
  phase,
  message,
  success,
  onCancel,
  onClose,
}: ImportProgressModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !importing && onClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => importing && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {success ? 'Import สำเร็จ!' : 'กำลัง Import ข้อมูล'}
          </DialogTitle>
        </DialogHeader>

        {/* Success State */}
        {success && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-900 mb-1">Import เสร็จสมบูรณ์!</h3>
              <p className="text-sm text-gray-600">ข้อมูลถูกนำเข้าสำเร็จแล้ว</p>
            </div>
            <Button onClick={onClose} className="mt-4">
              ปิด
            </Button>
          </div>
        )}

        {/* Importing State */}
        {importing && !success && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{message || 'กำลังประมวลผล...'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Phase: <span className="font-medium">{phase || 'เริ่มต้น'}</span>
                </p>
              </div>
              <span className="text-lg font-bold text-blue-600 ml-4">{progress}%</span>
            </div>

            <Progress value={progress} max={100} className="h-3" />

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <XCircle className="w-4 h-4 mr-1" />
                ยกเลิก
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              กรุณาอย่าปิดหน้าต่างนี้จนกว่าการ Import จะเสร็จสิ้น
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
