/**
 * Zone Employee Import Page
 * Upload XLSX file to import Zone, Employee, and ZoneEmployee data
 * Features:
 * - File upload with drag & drop
 * - Preview mode with validation
 * - Highlights new zones and employees
 * - Shows duplicates and errors
 * - Two-step import process (preview → confirm)
 *
 * Expected Excel columns:
 * ZONE_ID | แผนก | ZONE_TH | NAME | EMPLOYEE_ID | ROLE
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, XCircle, Download, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEPARTMENTS } from '@/config/departments';
import { useToast } from '@/hooks/use-toast';


interface ImportRow {
  zoneId: string;
  department?: string;
  zoneName: string;
  employeeName: string;
  employeeId: string;
  role?: string;
  chiefOfficerId?: string;
  dbHeadId?: string;
}

interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  isNewZone: boolean;
  isNewEmployee: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  data: ImportRow;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newZones: number;
  newEmployees: number;
  duplicates: number;
}

export default function ZoneEmployeeImportPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      toast({ variant: 'error', title: 'ไฟล์ไม่ถูกต้อง', description: 'กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)' });
      return;
    }

    setFile(selectedFile);
    setValidationResults(null);
    setSummary(null);
    setImportSuccess(false);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      console.log(`📄 Found ${workbook.SheetNames.length} sheets in workbook:`, workbook.SheetNames);
      
      // If multiple sheets, try auto-detect best sheet by header match; fallback to selector
      if (workbook.SheetNames.length > 1) {
        const expected = ['ZONE_ID','แผนก','ZONE_TH','NAME','EMPLOYEE_ID'];
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
          await loadAndProcessSheetData(selectedFile, only);
          return;
        }
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheets(new Set());
        toast({ title: 'พบหลายชีต', description: 'กรุณาเลือกชีตที่ต้องการนำเข้า (เลือกได้ 1 ชีต)' });
        return;
      }
      
      // Single sheet - proceed automatically
      setAvailableSheets([]);
      setSelectedSheets(new Set());
      
      // Load data from the single (or selected) sheets
      await loadAndProcessSheetData(selectedFile, new Set(workbook.SheetNames));
    } catch (error) {
      console.error('Error reading file:', error);
      toast({ variant: 'error', title: 'อ่านไฟล์ไม่สำเร็จ', description: 'ข้อผิดพลาดในการอ่านไฟล์ Excel' });
    }
  };

  // Load and process data from selected sheets
  const loadAndProcessSheetData = async (selectedFile: File, sheetsToLoad: Set<string>) => {
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Support multiple sheets - merge data from selected sheets
      let allJsonData: any[][] = [];
      
      console.log(`📝 Loading sheets:`, Array.from(sheetsToLoad));
      
      for (const sheetName of workbook.SheetNames) {
        if (!sheetsToLoad.has(sheetName)) {
          console.log(`  - Skipping sheet "${sheetName}"`);
          continue;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        console.log(`  - Loading sheet "${sheetName}": ${jsonData.length} rows`);
        
        // Add all rows (including header from first sheet)
        if (allJsonData.length === 0) {
          // First sheet - include header
          allJsonData = jsonData;
        } else if (jsonData.length > 1) {
          // Subsequent sheets - skip header row, append data only
          allJsonData = [...allJsonData, ...jsonData.slice(1)];
        }
      }
      
      const jsonData = allJsonData;

      if (jsonData.length < 2) {
        toast({ variant: 'error', title: 'โครงสร้างไฟล์ไม่ถูกต้อง', description: 'ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว (Header + Data)' });
        return;
      }

      // Debug: Show detected headers
      const detectedHeaders = jsonData[0];
      
      // Alert user about detected headers for debugging
      const headerStr = detectedHeaders.map((h: any, i: number) => `${String.fromCharCode(65 + i)}: ${h}`).join('\n');
      
      const nameToEmployeeId = new Map<string, string>();
      const nameToEmployeeIdLowerCase = new Map<string, string>();

      // 1. สร้าง Map เพื่อเก็บชื่อและ ID ของทุกคนในไฟล์ก่อน
      // รองรับทั้ง exact match และ case-insensitive match
      for (let i = 1; i < jsonData.length; i++) {
        const name = String(jsonData[i][3] || '').trim(); // คอลัมน์ NAME (D)
        const empId = String(jsonData[i][4] || '').trim(); // คอลัมน์ EMPLOYEE_ID (E)
        if (name && empId) {
          nameToEmployeeId.set(name, empId);
          nameToEmployeeIdLowerCase.set(name.toLowerCase(), empId);
        }
      }
      
      const rows: ImportRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every((cell: any) => !cell)) continue;

        const zoneId = String(row[0] || '').trim();
        let department = String(row[1] || '').trim() || undefined;
        const zoneName = String(row[2] || '').trim();
        const employeeName = String(row[3] || '').trim();
        const employeeId = String(row[4] || '').trim();
        const chiefOfficerName = String(row[5] || '').trim();
        const dbHeadName = String(row[6] || '').trim();

        // Determine role from EMPLOYEE_ID prefix first, then from name comparison
        let role: string | undefined = undefined;
        
        if (employeeId.startsWith('REG')) {
          role = 'DB_HEAD';
        } else if (employeeId.startsWith('ZNE')) {
          role = 'CHIEF';
        } else if (employeeId.startsWith('EMS')) {
          role = 'STAFF';
        } else if (employeeName && dbHeadName && employeeName === dbHeadName) {
          role = 'DB_HEAD';
        } else if (employeeName && chiefOfficerName && employeeName === chiefOfficerName) {
          role = 'CHIEF';
        } else {
          role = 'STAFF';
        }

        if (!department && zoneId) {
          if (zoneId.startsWith('CAR')) {
            department = 'DB5';
          } else {
            const match = zoneId.match(/EVD0?([1-6])/);
            if (match) department = `DB${match[1]}`;
          }
        }

        // ค้นหา CHIEF OFFICER ID ด้วยวิธีที่แข็งแกร่ง
        let resolvedChiefId: string | undefined = undefined;
        if (chiefOfficerName) {
          // ลองหา exact match ก่อน
          resolvedChiefId = nameToEmployeeId.get(chiefOfficerName);
          // ถ้าไม่เจอ ลอง case-insensitive
          if (!resolvedChiefId) {
            resolvedChiefId = nameToEmployeeIdLowerCase.get(chiefOfficerName.toLowerCase());
          }
          // ถ้ายังไม่เจอ ใช้ชื่อเลย (อาจเป็น EMPLOYEE_ID แล้ว)
          if (!resolvedChiefId) {
            resolvedChiefId = chiefOfficerName;
          }
        }

        // ค้นหา DB_HEAD ID ด้วยวิธีที่แข็งแกร่ง
        let resolvedDbHeadId: string | undefined = undefined;
        if (dbHeadName) {
          // ลองหา exact match ก่อน
          resolvedDbHeadId = nameToEmployeeId.get(dbHeadName);
          // ถ้าไม่เจอ ลอง case-insensitive
          if (!resolvedDbHeadId) {
            resolvedDbHeadId = nameToEmployeeIdLowerCase.get(dbHeadName.toLowerCase());
          }
          // ถ้ายังไม่เจอ ใช้ชื่อเลย (อาจเป็น EMPLOYEE_ID แล้ว)
          if (!resolvedDbHeadId) {
            resolvedDbHeadId = dbHeadName;
          }
        }

        console.log(`🔗 Row ${i + 1}: ${employeeName} (${employeeId}) - CHIEF: ${chiefOfficerName} → ${resolvedChiefId}, DB_HEAD: ${dbHeadName} → ${resolvedDbHeadId}`);

        rows.push({
          zoneId,
          department,
          zoneName,
          employeeName,
          employeeId,
          role,
          chiefOfficerId: resolvedChiefId,
          dbHeadId: resolvedDbHeadId,
        });
      }

      console.log("✅ Prepared Rows for Preview:", rows); 
      setPreviewData(rows);

      if (rows.length > 0) {
        handlePreview(rows);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({ variant: 'error', title: 'อ่านไฟล์ไม่สำเร็จ', description: 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel' });
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Preview and validate data
  const handlePreview = async (rows: ImportRow[]) => {
    try {
      const response = await fetch('/api/import/zone-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          mode: 'preview',
          filename: file?.name || 'unknown.xlsx',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Preview failed');
      }

      setSummary(result.summary);
      
      // Convert rows to ValidationResult format for display
      const validationResults: ValidationResult[] = rows.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check for missing required fields (same as server-side validation)
        if (!row.zoneId || !row.zoneName) {
          errors.push(`⚠️ Missing: Zone ID or Zone Name`);
        }
        if (!row.employeeId || !row.employeeName) {
          errors.push(`⚠️ Missing: Employee ID or Name`);
        }
        
        // DB_HEAD can be their own manager (top of hierarchy)
        // CHIEF can be their own manager if they also have themselves as DB_HEAD
        // STAFF cannot be their own manager
        const hasSelfRefChief = row.chiefOfficerId && row.chiefOfficerId.trim() !== '' && row.employeeId === row.chiefOfficerId;
        const hasSelfRefHead = row.dbHeadId && row.dbHeadId.trim() !== '' && row.employeeId === row.dbHeadId;
        
        // Only flag as error if STAFF is trying to manage themselves
        if (row.role === 'STAFF' && (hasSelfRefChief || hasSelfRefHead)) {
          errors.push(`❌ STAFF ${row.employeeId} cannot be their own manager`);
        }
        
        // For CHIEF and DB_HEAD, self-reference is OK (they're at top of their chain)
        // Just warn if missing hierarchy info
        if (row.role === 'CHIEF' && !row.dbHeadId) {
          warnings.push(`⚠️ CHIEF ${row.employeeId} has no DB_HEAD reference`);
        }
        if (row.role === 'STAFF' && !row.chiefOfficerId) {
          warnings.push(`⚠️ STAFF ${row.employeeId} has no CHIEF reference`);
        }
        
        return {
          rowNumber: index + 2,
          isValid: errors.length === 0,
          isNewZone: false,
          isNewEmployee: false,
          isDuplicate: false,
          errors,
          warnings,
          data: row,
        };
      });
      
      setValidationResults(validationResults);
    } catch (error: any) {
      toast({ variant: 'error', title: 'ตรวจสอบข้อมูลไม่สำเร็จ', description: String(error?.message || error) });
    }
  };

  // Import data (after preview)
  const handleImport = async () => {
    if (!previewData || previewData.length === 0) {
      toast({ variant: 'error', title: 'ไม่พบข้อมูล', description: 'ไม่มีข้อมูลให้ Import' });
      return;
    }

    if (summary && summary.invalidRows > 0) {
      toast({ variant: 'error', title: 'ไม่สามารถ Import ได้', description: 'มีข้อมูลที่ไม่ถูกต้อง กรุณาแก้ไขไฟล์แล้วลองใหม่' });
      return;
    }

    setImporting(true);

    try {
      const response = await fetch('/api/import/zone-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: previewData,
          mode: 'import',
          filename: file?.name || 'unknown.xlsx',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportSuccess(true);
      toast({ title: 'นำเข้าสำเร็จ', description: `นำเข้าข้อมูล ${result.rows} รายการเรียบร้อยแล้ว` });
    } catch (error: any) {
      toast({ variant: 'error', title: 'เกิดข้อผิดพลาด', description: String(error?.message || error) });
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/import/zone-employee');
      if (!res.ok) throw new Error('ดาวน์โหลด Template ไม่สำเร็จ');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zone_employee_template_current.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'ดาวน์โหลด Template สำเร็จ' });
      return;
    } catch (e: any) {
      toast({ variant: 'error', title: 'ดาวน์โหลด Template ไม่สำเร็จ', description: String(e?.message || e) });
    }

    // Fallback to static template if API not available yet
    const template = [
      ['ZONE_ID', 'แผนก', 'ZONE_TH', 'NAME', 'EMPLOYEE_ID', 'CHIEF OFFICER', 'DB HEAD'],
      ['REG10260EVD0001', 'DB1', 'กรุงเทพมหานคร Zone 1', 'นายสมชาย ใจดี', 'REG001', 'นายสมชาย ใจดี', 'นายสมชาย ใจดี'],
      ['ZNE10260EVD1001', 'DB1', 'กรุงเทพมหานคร Zone 1 - เขต 1', 'นางสาวสมหญิง รักงาน', 'ZNE001', 'นางสาวสมหญิง รักงาน', 'นายสมชาย ใจดี'],
      ['ZNE10260EVD1001', 'DB1', 'กรุงเทพมหานคร Zone 1 - เขต 1', 'นายวิชัย เก่งงาน', 'EMS001', 'นางสาวสมหญิง รักงาน', 'นายสมชาย ใจดี'],
      ['ZNE10260EVD1001', 'DB1', 'กรุงเทพมหานคร Zone 1 - เขต 1', 'นางสาววิภา ขยันดี', 'EMS002', 'นางสาวสมหญิง รักงาน', 'นายสมชาย ใจดี'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'zone_employee_template.xlsx');
  };

  // Get status badge
  const getStatusBadge = (result: ValidationResult) => {
    if (!result.isValid) {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">Error</span>;
    }
    if (result.warnings.length > 0) {
      return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">Warning</span>;
    }
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
          <p className="text-sm text-gray-500">
            นำเข้าข้อมูล Zone และพนักงาน
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">ดาวน์โหลด Template Excel เพื่อดูรูปแบบข้อมูลที่ถูกต้อง</h3>
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
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              {!file && (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                  </p>
                  <p className="text-sm text-gray-500">
                    รองรับไฟล์ .xlsx และ .xls เท่านั้น
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                key={file ? file.name : 'empty'}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                aria-label="Upload Excel file"
              />
              {!file && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  เลือกไฟล์
                </Button>
              )}

              {file && (
                <div className="mt-2 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3 bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow border">
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800 max-w-[360px] truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</div>
                    </div>
                    <button
                      type="button"
                      className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                      aria-label="ลบไฟล์"
                      onClick={() => {
                        setFile(null);
                        setPreviewData([]);
                        setValidationResults(null);
                        setSummary(null);
                        setImportSuccess(false);
                        setAvailableSheets([]);
                        setSelectedSheets(new Set());
                        // reset input so selecting the same file again triggers onChange
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        toast({ title: 'ยกเลิกไฟล์แล้ว' });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>


            {/* Sheet Selector - Show when multiple sheets detected */}
            {availableSheets.length > 1 && (
              <div className="mt-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">
                  พบหลายชีต - เลือกชีตที่ถูกต้อง
                </h4>
                <div className="space-y-2 mb-4">
                  {availableSheets.map((sheetName) => (
                    <label key={sheetName} className="flex items-center gap-3 cursor-pointer">
                     <input
                       type="radio"
                       name="sheetSelect"
                       checked={selectedSheets.has(sheetName)}
                       onChange={() => {
                         const newSelected = new Set<string>();
                         newSelected.add(sheetName);
                         setSelectedSheets(newSelected);
                       }}
                       className="w-4 h-4 rounded border-gray-300"
                     />
                      <span className="text-sm text-blue-900">{sheetName}</span>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (selectedSheets.size === 0) {
                      alert('กรุณาเลือกอย่างน้อย 1 Sheet');
                      return;
                    }
                    if (file) {
                      loadAndProcessSheetData(file, selectedSheets);
                    }
                  }}
                  variant="default"
                  size="sm"
                >
                  ยืนยันและนำเข้าข้อมูล
                </Button>
              </div>
            )}
          </div>

          {/* Column Format Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">รูปแบบคอลัมน์ใน Excel</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">A</span>
                <div>
                  <span className="font-medium">ZONE_ID</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs">รหัส Zone (REG/ZNE/EMS)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">B</span>
                <div>
                  <span className="font-medium">แผนก</span>
                  <p className="text-gray-500 text-xs">DB1-DB6 (ไม่บังคับ)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">C</span>
                <div>
                  <span className="font-medium">ZONE_TH</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs">ชื่อ Zone ภาษาไทย</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">D</span>
                <div>
                  <span className="font-medium">NAME</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs">ชื่อพนักงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">E</span>
                <div>
                  <span className="font-medium">EMPLOYEE_ID</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-gray-500 text-xs">รหัสพนักงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">F</span>
                <div>
                  <span className="font-medium">CHIEF OFFICER</span>
                  <p className="text-gray-500 text-xs">ชื่อหัวหน้าโซน (สำหรับอ้างอิง)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono bg-white px-2 py-1 rounded border text-xs font-bold">G</span>
                <div>
                  <span className="font-medium">DB HEAD</span>
                  <p className="text-gray-500 text-xs">ชื่อหัวหน้าแผนก (สำหรับอ้างอิง)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div className="bg-white rounded-lg p-3 border text-center">
                <div className="text-xl font-bold text-gray-900">{summary.totalRows}</div>
                <div className="text-xs text-gray-600">ทั้งหมด</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                <div className="text-xl font-bold text-green-700">{summary.validRows}</div>
                <div className="text-xs text-green-600">ถูกต้อง</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                <div className="text-xl font-bold text-red-700">{summary.invalidRows}</div>
                <div className="text-xs text-red-600">ผิดพลาด</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <div className="text-xl font-bold text-blue-700">{summary.newZones}</div>
                <div className="text-xs text-blue-600">Zone ใหม่</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                <div className="text-xl font-bold text-purple-700">{summary.newEmployees}</div>
                <div className="text-xs text-purple-600">พนักงานใหม่</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
                <div className="text-xl font-bold text-yellow-700">{summary.duplicates}</div>
                <div className="text-xs text-yellow-600">ซ้ำ</div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResults && validationResults.length > 0 && !importSuccess && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  ผลการตรวจสอบ ({validationResults.length} แถว)
                </h3>
                <Button
                  onClick={handleImport}
                  disabled={importing || (summary?.invalidRows || 0) > 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      กำลัง Import...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      ยืนยัน Import ({summary?.validRows || 0} รายการ)
                    </>
                  )}
                </Button>
              </div>

              {summary && summary.invalidRows > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">ไม่สามารถ Import ได้</h4>
                    <p className="text-sm text-red-700">
                      พบข้อมูลที่ไม่ถูกต้อง {summary.invalidRows} รายการ กรุณาแก้ไขไฟล์แล้วอัพโหลดใหม่
                    </p>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">แถว</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">สถานะ</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">ZONE_ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">ZONE_TH</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">EMPLOYEE_ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">NAME</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">ROLE</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">แผนก</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">ข้อความ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResults.map((result) => (
                        <tr
                          key={result.rowNumber}
                          className={`border-b ${!result.isValid
                            ? 'bg-red-50'
                            : result.warnings.length > 0
                              ? 'bg-yellow-50'
                              : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                          <td className="px-3 py-2 text-gray-500">{result.rowNumber}</td>
                          <td className="px-3 py-2">{getStatusBadge(result)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs">{result.data.zoneId}</span>
                              {result.isNewZone && (
                                <span className="px-1 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">NEW</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">{result.data.zoneName}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs">{result.data.employeeId}</span>
                              {result.isNewEmployee && (
                                <span className="px-1 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">NEW</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">{result.data.employeeName}</td>
                          <td className="px-3 py-2 text-xs">{result.data.role || 'STAFF'}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{result.data.department || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="space-y-1">
                              {result.errors.map((error, i) => (
                                <div key={i} className="flex items-start gap-1 text-red-600 text-xs">
                                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{error}</span>
                                </div>
                              ))}
                              {result.warnings.map((warning, i) => (
                                <div key={i} className="flex items-start gap-1 text-yellow-600 text-xs">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{warning}</span>
                                </div>
                              ))}
                              {result.isDuplicate && (
                                <div className="flex items-start gap-1 text-orange-600 text-xs">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>Duplicate pair in file</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {importSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-900 mb-2">Import สำเร็จ!</h3>
              <p className="text-green-700 mb-4">
                นำเข้าข้อมูล {summary?.validRows} รายการเรียบร้อยแล้ว
              </p>
              <Button
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                  setValidationResults(null);
                  setSummary(null);
                  setImportSuccess(false);
                }}
                variant="outline"
              >
                Import ไฟล์ใหม่
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
