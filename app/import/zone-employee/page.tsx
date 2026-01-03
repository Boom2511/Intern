'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useZoneEmployeeImport } from '@/hooks/useZoneEmployeeImport';
import { ValidationResult } from '@/types/zoneEmployee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, XCircle, Download, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

export default function ZoneEmployeeImportPage() {
  const hook = useZoneEmployeeImport();
  const { toast } = useToast();

  const [importSuccess, setImportSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Logic การเลือกไฟล์ (คงไว้ที่ Page เพื่อจัดการ UI Sheet Selector)
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        variant: 'error',
        title: 'ไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)'
      });
      return;
    }

    setImportSuccess(false);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);

      if (workbook.SheetNames.length > 1) {
        // หาชีตที่น่าจะใช่ที่สุด (Heuristic Search)
        const expected = ['ZONE_ID', 'แผนก', 'ZONE_TH', 'NAME', 'EMPLOYEE_ID'];
        let bestSheet: string | null = null;
        let bestScore = -1;

        for (const s of workbook.SheetNames) {
          const ws = workbook.Sheets[s];
          const header = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][])[0] || [];
          const headerUpper = header.map((h: any) => String(h || '').trim().toUpperCase());
          let score = 0;
          for (const e of expected) if (headerUpper.includes(e)) score++;
          if (score > bestScore) { bestScore = score; bestSheet = s; }
        }

        if (bestSheet && bestScore >= 4) {
          toast({ title: 'เลือกชีตอัตโนมัติ', description: `ระบบเลือกชีต: ${bestSheet}` });
          setAvailableSheets(workbook.SheetNames);
          const only = new Set<string>([bestSheet]);
          setSelectedSheets(only);
          await hook.selectFile(selectedFile, only);
          return;
        }

        setAvailableSheets(workbook.SheetNames);
        setSelectedSheets(new Set());
        setPendingFile(selectedFile);
        return;
      }

      // ไฟล์มีชีตเดียว ลุยได้เลย
      await hook.selectFile(selectedFile, new Set(workbook.SheetNames));
    } catch (error) {
      toast({
        variant: 'error',
        title: 'อ่านไฟล์ไม่สำเร็จ'
      });
    }
  }, [hook, toast]);

  // 2. Drag & Drop Handlers (เรียกใช้ handleFileSelect)
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  // 3. Import Action (เรียกใช้ hook.importData และจัดการ success state)
  const onConfirmImport = async () => {
    try {
      await hook.importData();
      setImportSuccess(true);
    } catch (err) {
      // hook จัดการ toast แล้ว แต่อาจจะใส่เพิ่มตรงนี้ได้
    }
  };

  const getStatusBadge = (result: ValidationResult) => {
    if (!result.isValid) return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">Error</span>;
    if (result.warnings.length > 0) return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">Warning</span>;
    return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">OK</span>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Import Zone & Employee Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ส่วน Upload */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />

            {/* แก้ไข Input: เพิ่ม id, aria-label และ title */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              aria-label="อัปโหลดไฟล์ข้อมูลพนักงาน"
              title="เลือกไฟล์ Excel"
            />

            {!hook.file ? (
              <Button
                type="button" // แก้ไข: ระบุ button type
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                เลือกไฟล์
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow border">
                  <FileSpreadsheet className="w-5 h-5 text-gray-600" aria-hidden="true" />
                  <span className="text-sm font-medium">{hook.file.name}</span>

    
                  <button
                    type="button" 
                    onClick={() => {
                      hook.clear();
                      setAvailableSheets([]);
                      setImportSuccess(false);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full"
                    aria-label="ลบไฟล์ที่เลือก" 
                    title="ลบไฟล์" 
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sheet Selector (ถ้ามีหลายชีต) */}
          {availableSheets.length > 1 && !hook.validationResults && (
            <div className="mt-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">พบหลายชีต - เลือกชีตที่ต้องการ</h4>
              <div className="space-y-2 mb-4">
                {availableSheets.map((s) => (
                  <label key={s} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="sheet" checked={selectedSheets.has(s)} onChange={() => setSelectedSheets(new Set([s]))} className="w-4 h-4" />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
              <Button onClick={() => pendingFile && hook.selectFile(pendingFile, selectedSheets)} disabled={selectedSheets.size === 0}>
                ตกลง
              </Button>
            </div>
          )}

          {/* Summary Stats (ดึงจาก hook.summary) */}
          {hook.summary && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <StatBox label="ทั้งหมด" value={hook.summary.totalRows} />
              <StatBox label="ถูกต้อง" value={hook.summary.validRows} color="text-green-700" bg="bg-green-50" />
              <StatBox label="ผิดพลาด" value={hook.summary.invalidRows} color="text-red-700" bg="bg-red-50" />
              <StatBox label="Zone ใหม่" value={hook.summary.newZones} color="text-blue-700" bg="bg-blue-50" />
              <StatBox label="พนักงานใหม่" value={hook.summary.newEmployees} color="text-purple-700" bg="bg-purple-50" />
              <StatBox label="ซ้ำ" value={hook.summary.duplicates} color="text-yellow-700" bg="bg-yellow-50" />
            </div>
          )}

          {/* Validation Table (ดึงจาก hook.validationResults) */}
          {hook.validationResults && hook.validationResults.length > 0 && !importSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">ผลการตรวจสอบ</h3>
                <Button
                  onClick={onConfirmImport}
                  disabled={hook.importing || hook.summary?.invalidRows! > 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {hook.importing ? "กำลัง Import..." : `ยืนยัน Import (${hook.summary?.validRows} รายการ)`}
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">แถว</th>
                      <th className="px-3 py-2 text-left">สถานะ</th>
                      <th className="px-3 py-2 text-left">ZONE_ID</th>
                      <th className="px-3 py-2 text-left">EMPLOYEE_ID</th>
                      <th className="px-3 py-2 text-left">NAME</th>
                      <th className="px-3 py-2 text-left">ข้อความ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hook.validationResults.map((result) => (
                      <tr key={result.rowNumber} className={`border-b ${!result.isValid ? 'bg-red-50' : 'bg-white'}`}>
                        <td className="px-3 py-2 text-gray-500">{result.rowNumber}</td>
                        <td className="px-3 py-2">{getStatusBadge(result)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{result.data.zoneId}</td>
                        <td className="px-3 py-2 font-mono text-xs">{result.data.employeeId}</td>
                        <td className="px-3 py-2 text-xs">{result.data.employeeName}</td>
                        <td className="px-3 py-2 text-xs">
                          {result.errors.map((e, i) => <div key={i} className="text-red-600">● {e}</div>)}
                          {result.warnings.map((w, i) => <div key={i} className="text-yellow-600">○ {w}</div>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success State */}
          {importSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-900">Import สำเร็จ!</h3>
              <Button onClick={() => { hook.clear(); setImportSuccess(false); }} variant="outline" className="mt-4">
                Import ไฟล์ใหม่
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Component สำหรับ Stat
function StatBox({ label, value, color = "text-gray-900", bg = "bg-white" }: { label: string, value: number, color?: string, bg?: string }) {
  return (
    <div className={`${bg} rounded-lg p-3 border text-center`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}