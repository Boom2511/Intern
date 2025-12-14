/**
 * LINE Webhook Debug Page
 * View webhook events and group IDs in real-time
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Copy, Check } from 'lucide-react';

export default function LineDebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/line/webhook');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch webhook data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LINE Webhook Debug</h1>
            <p className="text-gray-600 mt-1">View webhook events and extract Group IDs</p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Webhook Status */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Webhook URL</p>
                <code className="text-xs bg-gray-100 p-2 rounded block mt-1 break-all">
                  {data.webhook?.url}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">
                  <Badge className={data.webhook?.configured ? 'bg-green-500' : 'bg-red-500'}>
                    {data.webhook?.configured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {data.statistics?.totalEvents}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {data.statistics?.groupEvents}
                </div>
                <div className="text-sm text-gray-600 mt-1">Group Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {data.statistics?.userEvents}
                </div>
                <div className="text-sm text-gray-600 mt-1">User Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {data.statistics?.uniqueGroups}
                </div>
                <div className="text-sm text-gray-600 mt-1">Unique Groups</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group IDs */}
        {data.groupIds && data.groupIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detected Group IDs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.groupIds.map((group: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-500">Group {index + 1}</Badge>
                          <span className="text-xs text-gray-500">
                            {group.eventCount} events
                          </span>
                        </div>
                        <div className="font-mono text-sm bg-gray-100 p-3 rounded flex items-center justify-between">
                          <code className="text-blue-600 font-semibold">
                            {group.groupId}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(group.groupId)}
                          >
                            {copiedId === group.groupId ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>First seen: {new Date(group.firstSeen).toLocaleString('th-TH')}</p>
                      <p>Last event: {new Date(group.lastEvent).toLocaleString('th-TH')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Get Group ID</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>เพิ่ม LINE Bot เข้ากลุ่มทดสอบของคุณ</li>
              <li>ส่งข้อความใดๆ ในกลุ่มนั้น</li>
              <li>กดปุ่ม &quot;Refresh&quot; ด้านบน</li>
              <li>คัดลอก Group ID ที่ปรากฏ</li>
              <li>อัปเดต <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env</code> file:</li>
            </ol>
            <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
              <code>LINE_GROUP_TEST=&quot;&lt;your_group_id&gt;&quot;</code>
            </pre>
          </CardContent>
        </Card>

        {/* Recent Events */}
        {data.recentEvents && data.recentEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentEvents.map((event: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-gray-50 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{event.type}</Badge>
                      {event.source?.type === 'group' && (
                        <Badge className="bg-blue-500">Group</Badge>
                      )}
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                    {event.source?.groupId && (
                      <div className="text-gray-600">
                        Group ID: <span className="text-blue-600">{event.source.groupId}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
