'use client';

import { useState } from 'react';
import { createDepartmentWorkSnapshotMessage } from '@/lib/line-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFlexClient() {
  const [result, setResult] = useState<any>(null);

  const mockTicket = {
    id: 'test-123',
    ticketNo: 'TH-20251204-0001',
    issueType: 'NEW_DELIVERY' as any,
    issueTypeOther: null,
    priority: 'MEDIUM' as any,
    slaHours: 48,
    description: 'ลูกค้าต้องการให้นำจ่ายพัสดุใหม่อีกครั้ง เนื่องจากไม่ได้รับพัสดุครั้งแรก และต้องการให้ตรวจสอบสถานะการจัดส่งด้วย',
    recipientName: 'สมชาย ใจดี',
    recipientPhone: '081-234-5678',
    recipientAddress: '123/45 หมู่ 2 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    trackingNo: 'TH1234567890',
    createdAt: new Date(),
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    slaStatus: 'ON_TRACK' as any,
    status: 'NEW' as any,
    channel: 'CEC' as any,
    department: 'DB2' as any,
    customer: {
      id: 'customer-123',
      name: 'สมชาย ใจดี',
      phone: '081-234-5678',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const handleSendTest = async () => {
    try {
      const response = await fetch('/api/test-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    }
  };

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000';
  const queueUrl = `${baseUrl}/liff/queue?department=DB2`;

  const flexMessage = createDepartmentWorkSnapshotMessage({
    tickets: [mockTicket as any],
    department: 'DB2',
    departmentLabel: 'D2',
    zone: null,
    queueUrl,
  }).contents[0]; // Get first bubble for preview

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">LINE Flex Message Tester</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Flex Message Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Header */}
                  <div
                    style={{ backgroundColor: flexMessage.header.backgroundColor }}
                    className="p-5 text-center"
                  >
                    <div className="text-white text-lg">
                      {flexMessage.header.contents[0].text}
                    </div>
                  </div>

                  {/* Hero - SLA Section */}
                  {(flexMessage as any).hero && (
                    <div
                      style={{ backgroundColor: (flexMessage as any).hero.backgroundColor }}
                      className="py-1 text-center"
                    >
                      <div className="text-white text-sm">
                        {(flexMessage as any).hero.contents[0].text}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-5">
                    {/* Issue Type */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="text-gray-900 text-xl font-bold text-center">
                        {(flexMessage.body.contents[0] as any).contents[0].text}
                      </div>
                    </div>

                    {/* Department & Tracking */}
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-600">
                        {(flexMessage.body.contents[1] as any).contents[0].text}
                      </span>
                      {(flexMessage.body.contents[1] as any).contents[1] && (
                        <span className="text-blue-600 text-xs">
                          {(flexMessage.body.contents[1] as any).contents[1].text}
                        </span>
                      )}
                    </div>

                    <hr className="my-4" />

                    {/* Description */}
                    <div className="text-gray-600 text-sm mb-4">
                      {(flexMessage.body.contents[3] as any).text}
                    </div>

                    <hr className="my-4" />

                    {/* Contact Card */}
                    <div className="rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div>
                          <div className="text-gray-900 text-sm font-bold">
                            {(flexMessage.body.contents[5] as any).contents[0].contents[1].contents[0].text}
                          </div>
                          <div className="text-blue-600 text-xs mt-1">
                            {(flexMessage.body.contents[5] as any).contents[0].contents[1].contents[1].text}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Box */}
                    {(flexMessage.body.contents[6] as any)?.contents && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="text-gray-600 text-xs font-bold mb-1">
                          {(flexMessage.body.contents[6] as any).contents[0].text}
                        </div>
                        <div className="text-gray-700 text-xs">
                          {(flexMessage.body.contents[6] as any).contents[1].text}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-gray-400 text-xs mt-3">
                      {(flexMessage.body.contents[7] as any).text}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-gray-50">
                    <button
                      style={{ backgroundColor: (flexMessage.footer.contents[0] as any).color }}
                      className="w-full text-white py-2 rounded-lg font-medium"
                    >
                      {(flexMessage.footer.contents[0] as any).action.label}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: JSON & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleSendTest} className="w-full" size="lg">
                📤 ส่งทดสอบไป LINE
              </Button>

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(flexMessage, null, 2));
                  alert('คัดลอก JSON แล้ว!');
                }}
                variant="outline"
                className="w-full"
              >
                📋 Copy JSON
              </Button>

              <a
                href="https://developers.line.biz/flex-simulator/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full">
                  🔗 เปิด LINE Flex Simulator
                </Button>
              </a>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Flex Message JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(flexMessage, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
