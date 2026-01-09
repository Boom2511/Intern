import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ImportRow, ValidationResult, ImportSummary } from '@/types/zoneEmployee';
import { parseExcelRows } from '@/utils/zoneEmployeeImport/parseExcel';
import { validateRows } from '@/utils/zoneEmployeeImport/validateRows';
import { useToast } from '@/hooks/use-toast';

export function useZoneEmployeeImport() {
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>();
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState<string>('');
  const [importMessage, setImportMessage] = useState<string>('');
  
  // AbortController for cancelling import
  const abortControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setValidationResults(undefined);
    setSummary(null);
    setImporting(false);
    setImportProgress(0);
    setImportPhase('');
    setImportMessage('');
    
    // Abort any ongoing import
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const preview = useCallback(
    async (rows: ImportRow[]) => {
      const res = await fetch('/api/import/zone-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, mode: 'preview' }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSummary(json.summary);
      setValidationResults(validateRows(rows));
    },
    []
  );

  const selectFile = useCallback(
    async (file: File, sheets: Set<string>) => {
      setFile(file);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);

      const rows = parseExcelRows(workbook, sheets);
      setPreviewData(rows);

      await preview(rows);
    },
    [preview]
  );

  const importData = useCallback(async () => {
    if (!previewData.length) return;

    setImporting(true);
    setImportProgress(0);
    setImportPhase('starting');
    setImportMessage('เริ่มต้น Import...');
    
    // Create new AbortController for this import
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch('/api/import/zone-employee/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: previewData, filename: file?.name || 'import.xlsx' }),
        signal, // Attach abort signal
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            switch (event) {
              case 'progress':
                setImportProgress(data.percentage);
                setImportPhase(data.phase);
                setImportMessage(data.message);
                break;

              case 'complete':
                setImportProgress(100);
                setImportPhase('complete');
                setImportMessage('Import เสร็จสมบูรณ์!');
                setTimeout(() => {
                  setImporting(false);
                  toast({ 
                    title: 'Import สำเร็จ',
                    description: `นำเข้า ${data.rows} รายการ${data.hierarchyUpdated ? `, อัพเดตลำดับชั้น ${data.hierarchyUpdated} รายการ` : ''}`
                  });
                }, 500);
                break;

              case 'error':
                setImporting(false);
                setImportProgress(0);
                toast({ 
                  variant: 'destructive',
                  title: 'Import ล้มเหลว',
                  description: data.message
                });
                break;

              case 'cancelled':
                setImporting(false);
                setImportProgress(0);
                setImportPhase('');
                setImportMessage('');
                toast({ 
                  title: 'Import ถูกยกเลิก',
                  description: data.message
                });
                break;
            }
          }
        }
      }

      abortControllerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Import was cancelled
        setImporting(false);
        setImportProgress(0);
        setImportPhase('');
        setImportMessage('');
        toast({ 
          title: 'Import ถูกยกเลิก',
          description: 'การ Import ถูกยกเลิกโดยผู้ใช้'
        });
      } else {
        setImporting(false);
        setImportProgress(0);
        toast({ 
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: error.message || 'ไม่สามารถ Import ได้'
        });
      }
      abortControllerRef.current = null;
      throw error;
    }
  }, [previewData, file, toast]);

  const cancelImport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    file,
    previewData,
    validationResults,
    summary,
    importing,
    importProgress,
    importPhase,
    importMessage,
    selectFile,
    importData,
    cancelImport,
    clear,
  };
}
