'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, DownloadCloud, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DebugRow {
  rowNumber: number;
  employeeId: string;
  employeeName: string;
  chiefOfficerName: string;
  dbHeadName: string;
  resolvedChiefId: string | null;
  resolvedDbHeadId: string | null;
  note: string;
}

export default function ChiefOfficerDebugPage() {
  const [debugResults, setDebugResults] = useState<DebugRow[]>([]);
  const [nameToIdMap, setNameToIdMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      alert('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        alert('ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว');
        return;
      }

      // Step 1: สร้าง Map จากชื่อเป็น Employee ID
      const nameToIdExact = new Map<string, string>();
      const nameToIdLower = new Map<string, string>();

      for (let i = 1; i < jsonData.length; i++) {
        const name = String(jsonData[i][3] || '').trim();
        const empId = String(jsonData[i][4] || '').trim();
        if (name && empId) {
          nameToIdExact.set(name, empId);
          nameToIdLower.set(name.toLowerCase(), empId);
        }
      }

      // Step 2: Debug การ resolve CHIEF/DB_HEAD
      const debugRows: DebugRow[] = [];
      const mapForDisplay: Record<string, string> = {};

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every((cell: any) => !cell)) continue;

        const employeeId = String(row[4] || '').trim();
        const employeeName = String(row[3] || '').trim();
        const chiefOfficerName = String(row[5] || '').trim();
        const dbHeadName = String(row[6] || '').trim();

        // Try to resolve CHIEF
        let resolvedChiefId: string | null = null;
        let chiefNote = '';

        if (chiefOfficerName) {
          const exactMatch = nameToIdExact.get(chiefOfficerName);
          if (exactMatch) {
            resolvedChiefId = exactMatch;
            chiefNote = `✅ Exact match found`;
          } else {
            const lowerMatch = nameToIdLower.get(chiefOfficerName.toLowerCase());
            if (lowerMatch) {
              resolvedChiefId = lowerMatch;
              chiefNote = `⚠️ Case-insensitive match`;
            } else {
              resolvedChiefId = chiefOfficerName;
              chiefNote = `❌ No match found - using name as ID`;
            }
          }
        } else {
          chiefNote = '⚠️ Empty field';
        }

        // Try to resolve DB_HEAD
        let resolvedDbHeadId: string | null = null;
        let dbHeadNote = '';

        if (dbHeadName) {
          const exactMatch = nameToIdExact.get(dbHeadName);
          if (exactMatch) {
            resolvedDbHeadId = exactMatch;
            dbHeadNote = `✅ Exact match found`;
          } else {
            const lowerMatch = nameToIdLower.get(dbHeadName.toLowerCase());
            if (lowerMatch) {
              resolvedDbHeadId = lowerMatch;
              dbHeadNote = `⚠️ Case-insensitive match`;
            } else {
              resolvedDbHeadId = dbHeadName;
              dbHeadNote = `❌ No match found - using name as ID`;
            }
          }
        } else {
          dbHeadNote = '⚠️ Empty field';
        }

        const note = `CHIEF: ${chiefNote} | DB_HEAD: ${dbHeadNote}`;

        debugRows.push({
          rowNumber: i + 1,
          employeeId,
          employeeName,
          chiefOfficerName,
          dbHeadName,
          resolvedChiefId,
          resolvedDbHeadId,
          note,
        });

        mapForDisplay[employeeName] = employeeId;
      }

      setDebugResults(debugRows);
      setNameToIdMap(mapForDisplay);
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const exportDebug = () => {
    if (debugResults.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(debugResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Debug');
    XLSX.writeFile(wb, 'chief-officer-debug.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug: CHIEF OFFICER Mapping</h1>
          <p className="text-gray-600">
            ตรวจสอบว่าการเชื่อมโยง CHIEF OFFICER กับ Employee ID ตรงกับข้อมูลใน Excel หรือไม่
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              อัปโหลดไฟล์ Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition"
            >
              <p className="text-gray-700 mb-2">ลากไฟล์ Excel มาที่นี่ หรือ</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="text-blue-600 hover:underline cursor-pointer">
                เลือกไฟล์
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Name-to-ID Map */}
        {Object.keys(nameToIdMap).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">📋 Name-to-Employee ID Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {Object.entries(nameToIdMap).map(([name, id]) => (
                  <div key={name} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="font-semibold text-gray-700">{name}</div>
                    <div className="text-gray-600 font-mono text-xs">{id}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Results */}
        {debugResults.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                ผลการ Debug ({debugResults.length} แถว)
              </CardTitle>
              <Button onClick={exportDebug} variant="outline" size="sm">
                <DownloadCloud className="w-4 h-4 mr-2" />
                ส่งออก Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 border border-gray-300">Row</th>
                      <th className="text-left p-3 border border-gray-300">Employee ID</th>
                      <th className="text-left p-3 border border-gray-300">Name</th>
                      <th className="text-left p-3 border border-gray-300">CHIEF Name</th>
                      <th className="text-left p-3 border border-gray-300">→ Resolved ID</th>
                      <th className="text-left p-3 border border-gray-300">DB_HEAD Name</th>
                      <th className="text-left p-3 border border-gray-300">→ Resolved ID</th>
                      <th className="text-left p-3 border border-gray-300">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugResults.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-200 ${
                          row.note.includes('❌') ? 'bg-red-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-3 border border-gray-200">{row.rowNumber}</td>
                        <td className="p-3 border border-gray-200 font-mono text-xs">{row.employeeId}</td>
                        <td className="p-3 border border-gray-200">{row.employeeName}</td>
                        <td className="p-3 border border-gray-200">{row.chiefOfficerName || '(empty)'}</td>
                        <td className="p-3 border border-gray-200 font-mono text-xs bg-blue-50">
                          {row.resolvedChiefId || '-'}
                        </td>
                        <td className="p-3 border border-gray-200">{row.dbHeadName || '(empty)'}</td>
                        <td className="p-3 border border-gray-200 font-mono text-xs bg-blue-50">
                          {row.resolvedDbHeadId || '-'}
                        </td>
                        <td className="p-3 border border-gray-200 text-xs">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <div className="text-sm text-gray-600">✅ Exact Matches</div>
                  <div className="text-2xl font-bold text-green-600">
                    {debugResults.filter((r) => r.note.includes('Exact match')).length}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <div className="text-sm text-gray-600">⚠️ No Match / Empty</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {debugResults.filter((r) => r.note.includes('❌') || r.note.includes('Empty')).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="text-gray-600">กำลังประมวลผล...</div>
          </div>
        )}
      </div>
    </div>
  );
}
