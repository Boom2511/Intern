/**
 * Zone Employee Import Page
 * Upload XLSX file to import Zone, Employee, and ZoneEmployee data
 * Features:
 * - File upload with drag & drop
 * - Data preview before import
 * - Row-by-row error handling
 * - Import progress tracking
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PreviewRow {
  rowNumber: number;
  zoneId: string;
  zoneName: string;
  employeeId: string;
  employeeName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
}

interface ImportResult {
  rowNumber: number;
  success: boolean;
  error?: string;
  data?: {
    zoneId: string;
    zoneName: string;
    employeeId: string;
    employeeName: string;
  };
}

export default function ZoneEmployeeImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Parse XLSX file
  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      alert('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
      return;
    }

    setFile(selectedFile);
    setImportResults(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        alert('ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว (Header + Data)');
        return;
      }

      // Parse rows (skip header)
      const rows: PreviewRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Skip empty rows
        if (!row || row.every((cell: any) => !cell)) continue;

        rows.push({
          rowNumber: i + 1,
          zoneId: String(row[0] || '').trim(),
          zoneName: String(row[1] || '').trim(),
          employeeId: String(row[2] || '').trim(),
          employeeName: String(row[3] || '').trim(),
          email: String(row[4] || '').trim() || undefined,
          phone: String(row[5] || '').trim() || undefined,
          position: String(row[6] || '').trim() || undefined,
          department: String(row[7] || '').trim() || undefined,
        });
      }

      setPreviewData(rows);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel');
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Import data
  const handleImport = async () => {
    if (previewData.length === 0) {
      alert('ไม่มีข้อมูลให้ Import');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch('/api/import/zone-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: previewData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults(result.results);

      if (result.summary.errors === 0) {
        alert(`✅ Import สำเร็จ ${result.summary.success} รายการ`);
      } else {
        alert(
          `⚠️ Import เสร็จสิ้น\n` +
          `✅ สำเร็จ: ${result.summary.success} รายการ\n` +
          `❌ ล้มเหลว: ${result.summary.errors} รายการ\n` +
          `กรุณาตรวจสอบผลลัพธ์ด้านล่าง`
        );
      }
    } catch (error: any) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      ['Zone ID', 'Zone Name', 'Employee ID', 'Employee Name', 'Email', 'Phone', 'Position', 'Department'],
      ['Z001', 'กรุงเทพ Zone 1', 'E001', 'สมชาย ใจดี', 'somchai@example.com', '0812345678', 'พนักงานส่งพัสดุ', 'DB1'],
      ['Z001', 'กรุงเทพ Zone 1', 'E002', 'สมหญิง รักงาน', 'somying@example.com', '0823456789', 'พนักงานส่งพัสดุ', 'DB1'],
      ['Z002', 'กรุงเทพ Zone 2', 'E003', 'วิชัย เก่งงาน', '', '', 'หัวหน้าทีม', 'DB2'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'zone_employee_template.xlsx');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Import Zone & Employee Data
          </CardTitle>
          <p className="text-sm text-gray-500">
            นำเข้าข้อมูล Zone และพนักงานจากไฟล์ Excel (.xlsx)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">ดาวน์โหลด Template</h3>
                <p className="text-sm text-blue-700 mb-3">
                  ดาวน์โหลดไฟล์ Template Excel เพื่อดูรูปแบบข้อมูลที่ถูกต้อง
                </p>
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  ดาวน์โหลด Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกไฟล์ Excel
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-sm text-gray-500">
                  รองรับไฟล์ .xlsx และ .xls เท่านั้น
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                เลือกไฟล์
              </Button>
            </div>

            {file && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-medium">{file.name}</span>
                <span className="text-gray-400">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Column Format Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">รูปแบบคอลัมน์ใน Excel</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">A</span>
                <div>
                  <span className="font-medium">Zone ID</span>
                  <span className="text-red-500">*</span>
                  <p className="text-gray-500">รหัส Zone (ห้ามซ้ำ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">B</span>
                <div>
                  <span className="font-medium">Zone Name</span>
                  <span className="text-red-500">*</span>
                  <p className="text-gray-500">ชื่อ Zone</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">C</span>
                <div>
                  <span className="font-medium">Employee ID</span>
                  <span className="text-red-500">*</span>
                  <p className="text-gray-500">รหัสพนักงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">D</span>
                <div>
                  <span className="font-medium">Employee Name</span>
                  <span className="text-red-500">*</span>
                  <p className="text-gray-500">ชื่อพนักงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">E</span>
                <div>
                  <span className="font-medium">Email</span>
                  <p className="text-gray-500">อีเมล (ไม่บังคับ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">F</span>
                <div>
                  <span className="font-medium">Phone</span>
                  <p className="text-gray-500">เบอร์โทร (ไม่บังคับ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">G</span>
                <div>
                  <span className="font-medium">Position</span>
                  <p className="text-gray-500">ตำแหน่ง (ไม่บังคับ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs">H</span>
                <div>
                  <span className="font-medium">Department</span>
                  <p className="text-gray-500">แผนก (DB1-DB6, ไม่บังคับ)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Data */}
          {previewData.length > 0 && !importResults && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  ตัวอย่างข้อมูล ({previewData.length} แถว)
                </h3>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      กำลัง Import...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import ข้อมูล
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">แถว</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Zone ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Zone Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Employee ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Employee Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Position</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 100).map((row) => (
                        <tr key={row.rowNumber} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{row.rowNumber}</td>
                          <td className="px-4 py-2 font-mono text-xs">{row.zoneId}</td>
                          <td className="px-4 py-2">{row.zoneName}</td>
                          <td className="px-4 py-2 font-mono text-xs">{row.employeeId}</td>
                          <td className="px-4 py-2">{row.employeeName}</td>
                          <td className="px-4 py-2 text-gray-600">{row.email || '-'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.phone || '-'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.position || '-'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.department || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 100 && (
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 text-center border-t">
                    แสดง 100 แถวแรก จากทั้งหมด {previewData.length} แถว
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div>
              <h3 className="text-lg font-semibold mb-4">ผลลัพธ์การ Import</h3>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="text-2xl font-bold text-gray-900">
                    {importResults.length}
                  </div>
                  <div className="text-sm text-gray-600">ทั้งหมด</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">
                    {importResults.filter((r) => r.success).length}
                  </div>
                  <div className="text-sm text-green-600">สำเร็จ</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-700">
                    {importResults.filter((r) => !r.success).length}
                  </div>
                  <div className="text-sm text-red-600">ล้มเหลว</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">แถว</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">สถานะ</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Zone ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Zone Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Employee ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Employee Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResults.map((result) => (
                        <tr
                          key={result.rowNumber}
                          className={`border-b ${
                            result.success ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <td className="px-4 py-2 text-gray-500">{result.rowNumber}</td>
                          <td className="px-4 py-2">
                            {result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {result.data?.zoneId}
                          </td>
                          <td className="px-4 py-2">{result.data?.zoneName}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {result.data?.employeeId}
                          </td>
                          <td className="px-4 py-2">{result.data?.employeeName}</td>
                          <td className="px-4 py-2">
                            {result.error && (
                              <span className="text-red-600 text-xs">{result.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setImportResults(null);
                  }}
                  variant="outline"
                >
                  Import ไฟล์ใหม่
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
