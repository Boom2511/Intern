'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type EntityType = 'ZONE' | 'EMPLOYEE' | 'BRANCH';
type HistoryEntry = {
  id: number;
  actorName: string;
  branchId: number | null;
  entityType: EntityType;
  operation: string;
  description: string;
  effectiveAt: string;
  rolledBackAt: string | null;
};

export default function OrganizationChangeHistory({
  entityType,
  onRolledBack,
}: {
  entityType: EntityType;
  onRolledBack?: () => void;
}) {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/organization/history?entityType=${entityType}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load change history');
      setHistory(result.history);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load change history');
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const rollback = async () => {
    if (!pendingId || rollingBack) return;
    setRollingBack(true);
    try {
      const response = await fetch('/api/organization/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId: pendingId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to roll back this change');
      setPendingId(null);
      toast({ variant: 'success', title: 'ย้อนกลับรายการแล้ว', description: result.description });
      await loadHistory();
      onRolledBack?.();
    } catch (rollbackError) {
      toast({
        variant: 'error',
        title: 'ย้อนกลับรายการไม่สำเร็จ',
        description: rollbackError instanceof Error ? rollbackError.message : 'Unable to roll back this change',
      });
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <History className="h-4 w-4 text-slate-500" />ประวัติการเปลี่ยนแปลง
              </h2>
              <p className="mt-1 text-xs text-slate-500">แสดง 100 รายการล่าสุดในขอบเขตที่คุณมีสิทธิ์จัดการ</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg border-slate-300 text-xs text-slate-700 hover:bg-slate-50" onClick={() => void loadHistory()} disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}รีเฟรช
            </Button>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {loading ? <p className="py-3 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />กำลังโหลดประวัติ…</p>
            : history.length === 0 ? <p className="py-3 text-sm text-slate-500">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
              : <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${entry.rolledBackAt ? 'bg-slate-300' : 'bg-blue-700'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{entry.description}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(entry.effectiveAt).toLocaleString()} · {entry.actorName} · <span className="font-mono">{entry.operation}</span>
                        </p>
                        {entry.rolledBackAt && (
                          <p className="mt-1 text-xs text-amber-700">ย้อนกลับแล้ว {new Date(entry.rolledBackAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 self-end rounded-md border-slate-300 bg-white px-2.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:self-center"
                      onClick={() => setPendingId(entry.id)}
                      disabled={Boolean(entry.rolledBackAt) || rollingBack}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />ย้อนกลับ
                    </Button>
                  </li>
                ))}
              </ul>}
        </CardContent>
      </Card>
      <Dialog open={pendingId !== null} onOpenChange={(open) => { if (!open && !rollingBack) setPendingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันย้อนกลับรายการนี้?</DialogTitle>
            <DialogDescription>
              ระบบจะคืนค่าจากข้อมูลที่บันทึกไว้ และจะไม่ดำเนินการหากข้อมูลที่เกี่ยวข้องถูกเปลี่ยนแปลงภายหลัง
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={rollingBack} onClick={() => setPendingId(null)}>ยกเลิก</Button>
            <Button type="button" className="bg-blue-700 hover:bg-blue-800" disabled={rollingBack} onClick={() => void rollback()}>
              {rollingBack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันย้อนกลับ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
