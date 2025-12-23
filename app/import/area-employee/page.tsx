/**
 * Area Employee Import Page
 * Upload XLSX file to import Area, Employee, and AreaEmployee data
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
  department?: string;   
  zoneName: string;      
  employeeName: string;  
  employeeId: string;    
  chiefOfficer?: string; 
  dbHead?: string;       
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
    role?: string;
  };
}

export default function AreaEmployeeImportPage() {
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
      // Format: ZONE_ID, แผนก, ZONE_TH, NAME, EMPLOYEE_ID, CHIEF OFFICER, DB HEAD
      const rows: PreviewRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Skip empty rows
        if (!row || row.every((cell: any) => !cell)) continue;

        rows.push({
          rowNumber: i + 1,
          zoneId: String(row[0] || '').trim(),
          department: String(row[1] || '').trim() || undefined,
          zoneName: String(row[2] || '').trim(),
          employeeName: String(row[3] || '').trim(),
          employeeId: String(row[4] || '').trim(),
          chiefOfficer: String(row[5] || '').trim() || undefined,
          dbHead: String(row[6] || '').trim() || undefined,
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
      const response = await fetch('/api/import/area-employee', {
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
      ['ZONE_ID', 'แผนก', 'ZONE_TH', 'NAME', 'EMPLOYEE_ID', 'CHIEF OFFICER', 'DB HEAD'],
      ['REG10260EVD0001', 'DB1', 'เจ้าหน้าที่งานเก็บเงิน/งานพิเศษ', 'นายวิเชียร สืบกาสี', 'WICHIAN.SL', 'นายวิเชียร สืบกาสี', 'นายวิเชียร สืบกาสี'],
      ['ZNE10260EVD1001', 'DB1', 'ซนจ.1', 'นายไพรวัล วิจิตร', 'priwan.wi', 'นายไพรวัล วิจิตร', 'นายวิเชียร สืบกาสี'],
      ['EMS10260EVD1001', 'DB1', 'ด้านจ่ายที่ 1', 'นายไพรัตน์ หนูนารถ', 'pairut.nu', 'นายไพรวัล วิจิตร', 'นายวิเชียร สืบกาสี'],
      ['EMS10260EVD1002', 'DB1', 'ด้านจ่ายที่ 2', 'นายกิตติศักดิ์ บุญปัญญา', 'kittisak.bp', 'นายไพรวัล วิจิตร', 'นายวิเชียร สืบกาสี'],
      ['ZNE10260EVD1002', 'DB1', 'ซนจ.2', 'นายทวี กันยายุทธ์', 'tawee.kn', 'นายทวี กันยายุทธ์', 'นายวิเชียร สืบกาสี'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AREA_EMPLOYEE');
    XLSX.writeFile(wb, 'area_employee_template.xlsx');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Import Area & Employee Data
          </CardTitle>
          <p className="text-sm text-gray-500">
            นำเข้าข้อมูล Area และพนักงานจากไฟล์ Excel (.xlsx)
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
            <h3 className="font-semibold text-gray-900 mb-3">รูปแบบคอลัมน์ใน Excel</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">A</span>
                <div className="flex-1">
                  <span className="font-medium">ZONE_ID</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs mt-0.5">รหัสโซน (เช่น Z001, Z002)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">B</span>
                <div className="flex-1">
                  <span className="font-medium">แผนก</span>
                  <p className="text-gray-500 text-xs mt-0.5">แผนก (DB1-DB6, ไม่บังคับ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">C</span>
                <div className="flex-1">
                  <span className="font-medium">ZONE_TH</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs mt-0.5">ชื่อโซนภาษาไทย</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">D</span>
                <div className="flex-1">
                  <span className="font-medium">NAME</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs mt-0.5">ชื่อ-นามสกุลพนักงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">E</span>
                <div className="flex-1">
                  <span className="font-medium">EMPLOYEE_ID</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs mt-0.5">รหัสพนักงาน (REG/ZNE/EMS)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">F</span>
                <div className="flex-1">
                  <span className="font-medium">CHIEF OFFICER</span>
                  <p className="text-gray-500 text-xs mt-0.5">ชื่อหัวหน้าโซน (เช่น นายวิเชียร สืบกาสี)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">G</span>
                <div className="flex-1">
                  <span className="font-medium">DB HEAD</span>
                  <p className="text-gray-500 text-xs mt-0.5">ชื่อหัวหน้าภูมิภาค (เช่น นายไพรวัล วิจิตร)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">ลำดับความเป็นหัวหน้า (Role Hierarchy)</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-xs font-bold">REG</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-xs font-bold">ZNE</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-xs font-bold">EMS</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ระบบจะตรวจจับ Role อัตโนมัติจากรหัสพนักงาน (REG = DB HEAD, ZNE = CHIEF OFFICER, อื่นๆ = Employee)
              </p>
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
                        <th className="px-4 py-2 text-left font-medium text-gray-700">ZONE_ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">แผนก</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">ZONE_TH</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">NAME</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">EMPLOYEE_ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">CHIEF OFFICER</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">DB HEAD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 100).map((row) => (
                        <tr key={row.rowNumber} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{row.rowNumber}</td>
                          <td className="px-4 py-2 font-mono text-xs font-bold">{row.zoneId}</td>
                          <td className="px-4 py-2">
                            {row.department ? (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                {row.department}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{row.zoneName}</td>
                          <td className="px-4 py-2">{row.employeeName}</td>
                          <td className="px-4 py-2 font-mono text-xs">{row.employeeId}</td>
                          <td className="px-4 py-2 text-gray-700">{row.chiefOfficer || '-'}</td>
                          <td className="px-4 py-2 text-gray-700">{row.dbHead || '-'}</td>
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
                        <th className="px-4 py-2 text-left font-medium text-gray-700">ZONE_ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">ZONE_TH</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">EMPLOYEE_ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">NAME</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Role</th>
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
                          <td className="px-4 py-2 font-mono text-xs font-bold">
                            {result.data?.zoneId}
                          </td>
                          <td className="px-4 py-2">{result.data?.zoneName}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {result.data?.employeeId}
                          </td>
                          <td className="px-4 py-2">{result.data?.employeeName}</td>
                          <td className="px-4 py-2">
                            {result.data?.role && (
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                result.data.role === 'REG' ? 'bg-purple-100 text-purple-700' :
                                result.data.role === 'ZNE' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {result.data.role}
                              </span>
                            )}
                          </td>
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
