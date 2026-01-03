'use client';

import useSWR from 'swr';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function ZonesDiagnosticsPage() {
  const { toast } = useToast();
  const { data, error, mutate, isLoading } = useSWR('/api/diagnostics/zones', {
    onError: (err) => toast({ variant: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', description: err?.message || 'เกิดข้อผิดพลาด' }),
  });

  const onRefresh = async () => {
    const p = mutate();
    toast({ title: 'กำลังรีเฟรชข้อมูล...' });
    await p;
    toast({ title: 'รีเฟรชข้อมูลแล้ว' });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Diagnostics: Zones & Leads</h1>
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" /> รีเฟรช
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <div className="text-red-600">ไม่สามารถโหลดข้อมูลได้</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>สรุปภาพรวม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded border bg-green-50 border-green-200">
                  <div className="text-sm text-gray-600">โซนทั้งหมด</div>
                  <div className="text-2xl font-bold text-green-700">{data?.summary?.totalZones ?? '-'}</div>
                </div>
                <div className="p-4 rounded border bg-yellow-50 border-yellow-200">
                  <div className="text-sm text-gray-600">โซนที่มีปัญหา</div>
                  <div className="text-2xl font-bold text-yellow-700">{data?.summary?.zonesWithIssues ?? '-'}</div>
                </div>
                <div className="p-4 rounded border bg-orange-50 border-orange-200">
                  <div className="text-sm text-gray-600">ไม่มี CHIEF</div>
                  <div className="text-2xl font-bold text-orange-700">{data?.summary?.zonesMissingChief ?? '-'}</div>
                </div>
                <div className="p-4 rounded border bg-red-50 border-red-200">
                  <div className="text-sm text-gray-600">หา DB HEAD ไม่เจอ</div>
                  <div className="text-2xl font-bold text-red-700">{data?.summary?.zonesMissingDbHead ?? '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายละเอียดโซน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm border border-gray-200 bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 border text-left">Zone ID</th>
                      <th className="px-3 py-2 border text-left">Zone Name</th>
                      <th className="px-3 py-2 border text-left">Employees</th>
                      <th className="px-3 py-2 border text-left">Chief</th>
                      <th className="px-3 py-2 border text-left">DB Head</th>
                      <th className="px-3 py-2 border text-left">Issues</th>
                      <th className="px-3 py-2 border text-left">Missing Names</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results?.map((z: any) => {
                      const hasIssues = z.issues?.length > 0;
                      return (
                        <tr key={z.zoneId} className={hasIssues ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 border font-mono">{z.zoneId}</td>
                          <td className="px-3 py-2 border">{z.zoneName || '-'}</td>
                          <td className="px-3 py-2 border">{z.employeeCount}</td>
                          <td className="px-3 py-2 border">{z.chief}</td>
                          <td className="px-3 py-2 border">{z.dbHead}</td>
                          <td className="px-3 py-2 border">{hasIssues ? z.issues.join(', ') : <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4"/> OK</span>}</td>
                          <td className="px-3 py-2 border">{z.missingNames?.length ? z.missingNames.join(', ') : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
