/**
 * Reports Page
 * Generate and export Daily/Monthly reports with filters
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, Send, Loader2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type ReportType = 'daily' | 'monthly';
type SourceSystem = 'ALL' | 'CEC' | 'SALESFORCE';
type Department = 'ALL' | 'DB1' | 'DB2' | 'DB3' | 'DB4' | 'DB5' | 'DB6';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // Department filter removed per new requirement
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('ALL');
  const [lineGroupDepartment, setLineGroupDepartment] = useState<Department>('DB1'); // LINE target only (not a data filter)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const { toast } = useToast();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const handleConfirmSend = async () => {
    setSendDialogOpen(false);
    await handleSendToLine();
  };
  // For monthly mode: use month picker and derive start/end automatically
  const [monthYear, setMonthYear] = useState(format(new Date(), 'yyyy-MM'));

  // Fetch preview count when filters change
  useEffect(() => {
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const response = await fetch('/api/reports/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate: reportType === 'monthly' ? endDate : undefined,
            sourceSystem,
            includeSamples: true,
            sampleLimit: 8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewCount(data.count);
          setPreviewRows(data.samples || null);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
        setPreviewCount(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [reportType, startDate, endDate, sourceSystem]);

  // Helper function to get department label (kept only for LINE group display)
  const getDepartmentLabel = (dept: Department) => {
    const labels: Record<Department, string> = {
      ALL: 'ทั้งหมด',
      DB1: 'DB1',
      DB2: 'DB2',
      DB3: 'DB3',
      DB4: 'DB4',
      DB5: 'นำจ่ายรถยนต์',
      DB6: 'บริการประชาชน',
    };
    return labels[dept];
  };

  // LINE group list for selection (maintainable)
  const LINE_GROUPS: { value: Department; label: string }[] = [
    { value: 'DB1', label: getDepartmentLabel('DB1') },
    { value: 'DB2', label: getDepartmentLabel('DB2') },
    { value: 'DB3', label: getDepartmentLabel('DB3') },
    { value: 'DB4', label: getDepartmentLabel('DB4') },
    { value: 'DB5', label: getDepartmentLabel('DB5') },
    { value: 'DB6', label: getDepartmentLabel('DB6') },
  ];

  // When monthly, derive start/end from selected monthYear
  useEffect(() => {
    if (reportType === 'monthly') {
      try {
        const [y, m] = monthYear.split('-').map(Number);
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        setStartDate(format(first, 'yyyy-MM-dd'));
        setEndDate(format(last, 'yyyy-MM-dd'));
      } catch { }
    }
  }, [reportType, monthYear]);

  // Helper function to format date range
  const getDateRangeText = () => {
    if (reportType === 'daily') {
      return format(new Date(startDate), 'd MMM yyyy', { locale: th });
    } else {
      return format(new Date(startDate), 'MMMM yyyy', { locale: th });
    }
  };

  const handleDownload = async () => {
    // Validate date range for monthly reports
    if (reportType === 'monthly' && endDate < startDate) {
      alert('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          startDate,
          endDate: reportType === 'monthly' ? endDate : undefined,
          sourceSystem,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'ดาวน์โหลดสำเร็จ', description: 'รายงานถูกดาวน์โหลดเรียบร้อยแล้ว' });
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast({ variant: 'error', title: 'สร้างรายงานไม่สำเร็จ', description: error?.message || 'เกิดข้อผิดพลาดในการสร้างรายงาน' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToLine = async () => {
    // Validate date range for monthly reports
    if (reportType === 'monthly' && endDate < startDate) {
      alert('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/reports/send-to-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          startDate,
          endDate: reportType === 'monthly' ? endDate : undefined,
          sourceSystem,
          lineGroupDepartment, // Send to this LINE group
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send report');
      }

      toast({
        title: 'ส่งรายงานสำเร็จ',
        description: `รายงานถูกส่งไปยัง LINE Group แล้ว (จำนวน: ${data.ticketCount} รายการ, ขนาดไฟล์: ${data.fileSizeMB} MB)`,
      });
    } catch (error: any) {
      console.error('Error sending report to LINE:', error);
      toast({ variant: 'error', title: 'ส่งรายงานไม่สำเร็จ', description: error?.message || 'เกิดข้อผิดพลาดในการส่งรายงาน' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">สร้างรายงาน</h1>

      <Card>
        <CardHeader>
          <CardTitle>ตัวกรองรายงาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="reportType">ประเภทรายงาน</Label>
            <Select
              value={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
            >
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">รายงานประจำวัน (Daily)</SelectItem>
                <SelectItem value="monthly">รายงานประจำเดือน (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportType === 'daily' ? (
              <div className="space-y-2">
                <Label htmlFor="startDate">วันที่</Label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="วันที่"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="monthYear">เดือน</Label>
                <input
                  id="monthYear"
                  type="month"
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  aria-label="เดือน"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>


          {/* Source System Filter */}
          <div className="space-y-2">
            <Label htmlFor="sourceSystem">แหล่งที่มา</Label>
            <Select
              value={sourceSystem}
              onValueChange={(value) => setSourceSystem(value as SourceSystem)}
            >
              <SelectTrigger id="sourceSystem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="CEC">CEC </SelectItem>
                <SelectItem value="SALESFORCE">Salesforce</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Preview Section */}
          {loadingPreview ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">กำลังโหลดตัวอย่าง...</span>
              </div>
            </div>
          ) : previewCount !== null ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">ตัวอย่างรายงาน</h4>
                  <p className="text-sm text-blue-800">
                    รายงานนี้มีทั้งหมด <span className="font-bold">{previewCount}</span> รายการ
                    {', '}
                    ช่วงวันที่: <span className="font-medium">{getDateRangeText()}</span>
                    แหล่งที่มา: <span className="font-medium">{sourceSystem === 'ALL' ? 'ทั้งหมด' : sourceSystem}</span>
                  </p>

                  {previewRows && previewRows.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm border border-blue-200 bg-white">
                        <thead>
                          <tr className="bg-blue-100 text-blue-900">
                            <th className="px-3 py-2 border border-blue-200 text-left">ใบงานเลขที่</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">ชื่อลูกค้า</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">แผนก</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">ผู้ควบคุม</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">หัวหน้า DB</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">ความต้องการลูกค้า</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">ผลการดำเนินการ</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">สาเหตุ</th>
                            <th className="px-3 py-2 border border-blue-200 text-left">แนวทางแก้ไข</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-blue-50">
                              <td className="px-3 py-2 border border-blue-100">{row.ticketNo}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.customerName}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.department}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.chief}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.dbHead}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.description}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.status}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.cause}</td>
                              <td className="px-3 py-2 border border-blue-100">{row.solution}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={handleDownload}
              disabled={isGenerating || isSending}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้างรายงาน...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  ดาวน์โหลดรายงาน
                </>
              )}
            </Button>

            <Dialog
              open={sendDialogOpen}
              onOpenChange={(open) => {
                if (!isSending) setSendDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  disabled={isGenerating || isSending}
                  variant="outline"
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      LINE Group
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent onInteractOutside={(e) => { if (isSending) { e.preventDefault(); } }}>
                <DialogHeader>
                  <DialogTitle>เลือกกลุ่ม LINE ที่จะส่ง</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="lineGroup">กลุ่ม LINE</Label>
                  <Select
                    value={lineGroupDepartment}
                    onValueChange={(value) => setLineGroupDepartment(value as Department)}
                  >
                    <SelectTrigger id="lineGroup">
                      <SelectValue placeholder="เลือกกลุ่ม LINE" />
                    </SelectTrigger>
                    <SelectContent>
                      {LINE_GROUPS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button
                    onClick={handleConfirmSend}
                    disabled={isSending || !lineGroupDepartment}
                  >
                    ยืนยันส่งไปยัง LINE {getDepartmentLabel(lineGroupDepartment)}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>


        </CardContent>
      </Card>
    </div>
  );
}
