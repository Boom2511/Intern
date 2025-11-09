/**
 * LINE Integration Test Page
 * ทดสอบการส่งข้อความไปยัง LINE
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function LineTestPage() {
  const [groupId, setGroupId] = useState('');
  const [message, setMessage] = useState('สวัสดีจาก Help Desk System! 🎉');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!groupId.trim()) {
      alert('กรุณากรอก Group ID');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/line/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, message }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งข้อความ',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendFlexTest = async () => {
    if (!groupId.trim()) {
      alert('กรุณากรอก Group ID');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/line/test-flex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งข้อความ',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ทดสอบ LINE Integration</h1>
        <p className="text-gray-600 mt-2">
          ทดสอบการส่งข้อความไปยัง LINE Group
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>สถานะการตั้งค่า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>LINE_CHANNEL_ACCESS_TOKEN: กำหนดแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>LINE_DEFAULT_GROUP_ID: ต้องกรอก Group ID ด้านล่าง</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Form */}
      <Card>
        <CardHeader>
          <CardTitle>ส่งข้อความทดสอบ</CardTitle>
          <CardDescription>
            กรอก Group ID และข้อความที่ต้องการส่ง
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LINE Group ID <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="เช่น Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              ดูวิธีหา Group ID ด้านล่าง
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ข้อความ
            </label>
            <Textarea
              placeholder="ข้อความที่ต้องการส่ง"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSendTest}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  ส่งข้อความธรรมดา
                </>
              )}
            </Button>

            <Button
              onClick={handleSendFlexTest}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  ส่ง Flex Message
                </>
              )}
            </Button>
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4
                  className={`font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด'}
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">วิธีหา LINE Group ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">วิธีที่ 1: ใช้ LINE Developers Console</h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>เปิด Bot เข้ากลุ่มที่ต้องการทดสอบ</li>
                <li>ส่งข้อความอะไรก็ได้ในกลุ่ม</li>
                <li>ไปที่ LINE Developers Console → Messaging API → Webhook</li>
                <li>Enable webhook และตั้ง URL: <code className="bg-blue-100 px-1 rounded">https://your-domain.com/api/webhooks/line</code></li>
                <li>ดู logs เพื่อหา Group ID (จะขึ้นต้นด้วย C...)</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">วิธีที่ 2: ใช้ Manual Test API</h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>ไปที่: <a href="https://developers.line.biz/console/channel/{channelId}/messaging-api" target="_blank" rel="noopener noreferrer" className="underline">LINE Messaging API Console</a></li>
                <li>หาส่วน &quot;Send test message&quot;</li>
                <li>เลือก group แล้ว copy Group ID</li>
              </ol>
            </div>

            <div className="bg-blue-100 p-3 rounded">
              <p className="font-semibold">💡 เคล็ดลับ:</p>
              <p className="mt-1">หลังจากหา Group ID ได้แล้ว ให้เพิ่มใน <code className="bg-white px-1 rounded">.env</code>:</p>
              <pre className="bg-white p-2 rounded mt-2 overflow-x-auto">
                LINE_DEFAULT_GROUP_ID=&quot;Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&quot;
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
