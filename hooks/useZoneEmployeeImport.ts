import { useState, useCallback } from 'react';
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

  const clear = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setValidationResults(undefined);
    setSummary(null);
    setImporting(false);
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
    await fetch('/api/import/zone-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: previewData, mode: 'import' }),
    });

    setImporting(false);
    toast({ title: 'Import สำเร็จ' });
  }, [previewData, toast]);

  return {
    file,
    previewData,
    validationResults,
    summary,
    importing,
    selectFile,
    importData,
    clear,
  };
}
