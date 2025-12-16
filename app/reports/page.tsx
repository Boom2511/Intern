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
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type ReportType = 'daily' | 'monthly';
type SourceSystem = 'ALL' | 'CEC' | 'SALESFORCE';
type Department = 'ALL' | 'DB1' | 'DB2' | 'DB3' | 'DB4' | 'DB5' | 'DB6';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [department, setDepartment] = useState<Department>('ALL');
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('ALL');
  const [lineGroupDepartment, setLineGroupDepartment] = useState<Department>('DB1'); // Separate selection for LINE group
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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
            endDate: reportType === 'monthly' ? endDate : startDate,
            department: department === 'ALL' ? undefined : department,
            sourceSystem,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
        setPreviewCount(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [reportType, startDate, endDate, department, sourceSystem]);

  // Helper function to get department label
  const getDepartmentLabel = (dept: Department) => {
    const labels: Record<Department, string> = {
      ALL: 'ทั้งหมด',
      DB1: 'D1',
      DB2: 'D2',
      DB3: 'D3',
      DB4: 'D4',
      DB5: 'นำจ่ายรถยนต์',
      DB6: 'บริการประชาชน',
    };
    return labels[dept];
  };

  // Helper function to format date range
  const getDateRangeText = () => {
    if (reportType === 'daily') {
      return format(new Date(startDate), 'd MMM yyyy', { locale: th });
    } else {
      return `${format(new Date(startDate), 'd', { locale: th })}–${format(new Date(endDate), 'd MMM yyyy', { locale: th })}`;
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
          department: department === 'ALL' ? undefined : department,
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

      alert('รายงานถูกดาวน์โหลดเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('เกิดข้อผิดพลาดในการสร้างรายงาน');
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
          department: department === 'ALL' ? undefined : department, // Filter data
          sourceSystem,
          lineGroupDepartment, // Send to this LINE group
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send report');
      }

      alert(`รายงานถูกส่งไปยัง LINE Group เรียบร้อยแล้ว\nจำนวน: ${data.ticketCount} รายการ\nขนาดไฟล์: ${data.fileSizeMB} MB`);
    } catch (error: any) {
      console.error('Error sending report to LINE:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการส่งรายงาน');
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
            <div className="space-y-2">
              <Label htmlFor="startDate">
                {reportType === 'daily' ? 'วันที่' : 'วันที่เริ่มต้น'}
              </Label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {reportType === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Department Filter */}
          <div className="space-y-2">
            <Label htmlFor="department">แผนก</Label>
            <Select
              value={department}
              onValueChange={(value) => setDepartment(value as Department)}
            >
              <SelectTrigger id="department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="DB1">D1</SelectItem>
                <SelectItem value="DB2">D2</SelectItem>
                <SelectItem value="DB3">D3</SelectItem>
                <SelectItem value="DB4">D4</SelectItem>
                <SelectItem value="DB5">นำจ่ายรถยนต์</SelectItem>
                <SelectItem value="DB6">บริการประชาชน</SelectItem>
              </SelectContent>
            </Select>
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

          {/* LINE Group Selection */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="lineGroup" className="text-blue-700 font-semibold">
              เลือกกลุ่ม LINE ที่จะส่ง
            </Label>
            <Select
              value={lineGroupDepartment}
              onValueChange={(value) => setLineGroupDepartment(value as Department)}
            >
              <SelectTrigger id="lineGroup" className="border-blue-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DB1">D1</SelectItem>
                <SelectItem value="DB2">D2</SelectItem>
                <SelectItem value="DB3">D3</SelectItem>
                <SelectItem value="DB4">D4</SelectItem>
                <SelectItem value="DB5">นำจ่ายรถยนต์</SelectItem>
                <SelectItem value="DB6">บริการประชาชน</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              💡 การเลือกแผนกด้านบนจะกรองข้อมูลใน report / การเลือกกลุ่ม LINE นี้จะส่งไปกลุ่มที่เลือก
            </p>
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
                    {', '}
                    แผนก: <span className="font-medium">{getDepartmentLabel(department)}</span>
                    {', '}
                    แหล่งที่มา: <span className="font-medium">{sourceSystem === 'ALL' ? 'ทั้งหมด' : sourceSystem}</span>
                  </p>
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

            <Button
              onClick={handleSendToLine}
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
                  ส่งไปยัง LINE {getDepartmentLabel(lineGroupDepartment)}
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="font-semibold mb-2">คำแนะนำ</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
              <li>เลือกแผนก :ถ้าเลือกแผนกไหนก็จะเป็น report แผนกนั้น ๆ (แต่ก็จะส่งไฟล์ไปแค่กลุ่มแค่กลุ่มไลน์นั้น ๆ)</li>
              <li>ขนาดไฟล์สูงสุดสำหรับ LINE: 10MB</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
