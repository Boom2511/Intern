'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Send, Loader2, Info, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { th } from 'date-fns/locale';
import Link from 'next/link';

// --- Types & Constants ---
type ReportType = 'daily' | 'monthly';
type SourceSystem = 'ALL' | 'CEC' | 'SALESFORCE';
type Department = 'ALL' | 'DB1' | 'DB2' | 'DB3' | 'DB4' | 'DB5' | 'DB6';

const DEPT_LABELS: Record<Department, string> = {
  ALL: 'ทั้งหมด', DB1: 'DB1', DB2: 'DB2', DB3: 'DB3', DB4: 'DB4', DB5: 'นำจ่ายรถยนต์', DB6: 'บริการประชาชน',
};

// --- Sub-Component: Report Table ---
const ReportTable = ({ data }: { data: any[] }) => (
  <div className="overflow-x-auto border rounded-md shadow-sm">
    <table className="min-w-full text-[11px] border-collapse bg-white">
      <thead className="sticky top-0 z-10 bg-blue-600 text-white">
        <tr>
          {['ลำดับ', 'ใบงานเลขที่', 'Salesforce', 'หมายเลขสิ่งของ', 'ชื่อลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'เจ้าหน้าที่', 'แผนก', 'ผู้ควบคุม', 'หัวหน้า DB', 'ความต้องการ', 'ผลดำเนินการ', 'สาเหตุ', 'แนวทางแก้ไข'].map((h) => (
            <th key={h} className="px-2 py-2 border-r border-blue-500 font-medium whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={`hover:bg-blue-50 border-b ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
            <td className="px-2 py-1.5 text-center text-gray-500">{i + 1}</td>
            <td className="px-2 py-1.5 font-medium whitespace-nowrap">
              <Link href={`/tickets/${row.ticketId}`} className="text-blue-700 hover:text-blue-900 hover:underline" target="_blank">
                {row.ticketNo}
              </Link>
            </td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.salesforceId}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.trackingNo}</td>
            <td className="px-2 py-1.5 font-medium whitespace-nowrap">{row.customerName}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.customerPhone}</td>
            <td className="px-2 py-1.5 max-w-[200px] truncate">{row.customerAddress}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.staffName}</td>
            <td className="px-2 py-1.5 text-center">
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">{row.department}</span>
            </td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.chief}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.dbHead}</td>
            <td className="px-2 py-1.5 max-w-[150px] truncate">{row.description}</td>
            <td className="px-2 py-1.5 max-w-[150px] truncate">{row.resolutionDetail}</td>
            <td className="px-2 py-1.5 max-w-[150px] truncate">{row.cause}</td>
            <td className="px-2 py-1.5 max-w-[150px] truncate">{row.solution}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Main Page Component ---
export default function ReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [monthYear, setMonthYear] = useState(format(new Date(), 'yyyy-MM'));
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('ALL');
  const [lineGroupDepartment, setLineGroupDepartment] = useState<Department>('DB1');
  
  const [status, setStatus] = useState({ generating: false, sending: false, loadingPreview: false });
  const [preview, setPreview] = useState<{ count: number | null, rows: any[] | null }>({ count: null, rows: null });
  const [dialogs, setDialogs] = useState({ send: false, preview: false });

  // Auto-calculate dates for monthly report
  useEffect(() => {
    if (reportType === 'monthly') {
      const date = parseISO(`${monthYear}-01`);
      setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
    }
  }, [reportType, monthYear]);

  // Fetch Preview Logic
  useEffect(() => {
    const fetchPreview = async () => {
      setStatus(prev => ({ ...prev, loadingPreview: true }));
      try {
        const res = await fetch('/api/reports/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate: reportType === 'monthly' ? endDate : undefined, sourceSystem, includeSamples: true, sampleLimit: 9999 }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreview({ count: data.count, rows: data.samples });
        }
      } catch (e) { console.error(e); }
      finally { setStatus(prev => ({ ...prev, loadingPreview: false })); }
    };
    fetchPreview();
  }, [startDate, endDate, sourceSystem, reportType]);

  const dateRangeText = useMemo(() => {
    const date = new Date(startDate);
    return reportType === 'daily' ? format(date, 'd MMM yyyy', { locale: th }) : format(date, 'MMMM yyyy', { locale: th });
  }, [startDate, reportType]);

  const handleAction = async (actionType: 'download' | 'send') => {
    const isDownload = actionType === 'download';
    setStatus(prev => ({ ...prev, [isDownload ? 'generating' : 'sending']: true }));

    try {
      const endpoint = isDownload ? '/api/reports/generate' : '/api/reports/send-to-line';
      const body = { reportType, startDate, endDate: reportType === 'monthly' ? endDate : undefined, sourceSystem, ...(isDownload ? {} : { lineGroupDepartment }) };
      
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Action failed');

      if (isDownload) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Generate filename with Thai date format
        const date = new Date(startDate);
        const thaiDateStr = format(date, 'd MMM yyyy', { locale: th });
        const reportTypeText = reportType === 'daily' ? 'ประจำวันที่' : 'ประจำเดือน';
        a.download = `รายงาน${reportTypeText} ${thaiDateStr} เรื่องร้องเรียน ปณศ.บางนา.xlsx`;
        a.click();
        toast({ title: 'สำเร็จ', description: 'ดาวน์โหลดรายงานเรียบร้อย' });
      } else {
        const data = await res.json();
        toast({ title: 'ส่งสำเร็จ', description: `ส่งไปยังกลุ่ม LINE เรียบร้อย (${data.ticketCount} รายการ)` });
        setDialogs(prev => ({ ...prev, send: false }));
      }
    } catch (e: any) {
      toast({ variant: 'error', title: 'ไม่สำเร็จ', description: e.message });
    } finally {
      setStatus(prev => ({ ...prev, [isDownload ? 'generating' : 'sending']: false }));
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">สร้างรายงานระบบ</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">ตัวกรองรายงาน</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">รายวัน</SelectItem>
                  <SelectItem value="monthly">รายเดือน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{reportType === 'daily' ? 'วันที่' : 'เดือน'}</Label>
              <input
                type={reportType === 'daily' ? 'date' : 'month'}
                value={reportType === 'daily' ? startDate : monthYear}
                aria-label='ประเภทรายงาน'
                onChange={(e) => reportType === 'daily' ? setStartDate(e.target.value) : setMonthYear(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md text-sm shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>แหล่งข้อมูล</Label>
              <Select value={sourceSystem} onValueChange={(v: SourceSystem) => setSourceSystem(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด</SelectItem>
                  <SelectItem value="CEC">CEC</SelectItem>
                  <SelectItem value="SALESFORCE">Salesforce</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Info Box */}
          <div className={`p-4 rounded-lg border transition-all ${status.loadingPreview ? 'bg-gray-50 opacity-60' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-2 text-blue-900">
                {status.loadingPreview ? <Loader2 className="h-5 w-5 animate-spin" /> : <Info className="h-5 w-5" />}
                <div>
                  <p className="font-semibold text-sm">สรุปรายการ: {preview.count ?? 0} รายการ</p>
                  <p className="text-xs text-blue-700">{dateRangeText} | {sourceSystem}</p>
                </div>
              </div>
              {preview.rows && preview.rows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setDialogs(p => ({ ...p, preview: true }))} className="text-blue-700 hover:bg-blue-100">
                  <Maximize2 className="h-4 w-4 mr-1" /> ขยายจอ
                </Button>
              )}
            </div>
            
            {preview.rows && preview.rows.length > 0 && (
              <div className="-mx-2"><ReportTable data={preview.rows} /></div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => handleAction('download')} disabled={status.generating || status.sending} className="flex-1">
              {status.generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              ดาวน์โหลด Excel
            </Button>

            <Dialog open={dialogs.send} onOpenChange={(o) => !status.sending && setDialogs(p => ({ ...p, send: o }))}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={status.generating || status.sending} className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                  {status.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  ส่งเข้า LINE Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>เลือกกลุ่มเป้าหมาย</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>กลุ่ม LINE แผนก</Label>
                    <Select value={lineGroupDepartment} onValueChange={(v: Department) => setLineGroupDepartment(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DEPT_LABELS).filter(([k]) => k !== 'ALL').map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => handleAction('send')} disabled={status.sending} className="w-full">
                    ยืนยันส่งข้อมูล ({preview.count} รายการ)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      <Dialog open={dialogs.preview} onOpenChange={(o) => setDialogs(p => ({ ...p, preview: o }))}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>ตัวอย่างข้อมูลฉบับเต็ม</DialogTitle>
            <p className="text-sm text-muted-foreground">{dateRangeText} | {preview.count} รายการ</p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            <ReportTable data={preview.rows || []} />
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setDialogs(p => ({ ...p, preview: false }))}>ปิดหน้าต่าง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}