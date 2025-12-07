'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface LiffConfig {
  configured: boolean;
  liffId: string;
  baseUrl: string;
  testLiffUrl: string;
  message: string;
}

export default function TestLiffPage() {
  const [config, setConfig] = useState<LiffConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-liff-config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load LIFF config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-10">
            <div className="text-center">กำลังโหลด...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {config?.configured ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              LIFF Configuration Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  LIFF ID
                </div>
                <div className="font-mono text-sm break-all">
                  {config?.liffId}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Base URL
                </div>
                <div className="font-mono text-sm break-all">
                  {config?.baseUrl}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Test LIFF URL
              </div>
              <div className="font-mono text-xs break-all text-blue-700">
                {config?.testLiffUrl}
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                config?.configured
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <div className="text-sm font-medium">
                {config?.message}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">How to fix if not configured:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Go to Vercel Dashboard → Settings → Environment Variables</li>
                <li>Add: <code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_LIFF_ID</code> = <code className="bg-gray-100 px-2 py-1 rounded">2008646165-8kK4l7Xp</code></li>
                <li>Add: <code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_BASE_URL</code> = <code className="bg-gray-100 px-2 py-1 rounded">https://intern-tawny.vercel.app</code></li>
                <li>Save and Redeploy</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadConfig} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => window.open(config?.testLiffUrl, '_blank')}
                disabled={!config?.configured}
              >
                Test Open LIFF URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables (Client-Side)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>NEXT_PUBLIC_LIFF_ID:</span>
                <span className={process.env.NEXT_PUBLIC_LIFF_ID ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_LIFF_ID || '❌ NOT SET'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>NEXT_PUBLIC_BASE_URL:</span>
                <span className={process.env.NEXT_PUBLIC_BASE_URL ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_BASE_URL || '❌ NOT SET'}
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              ℹ️ Note: These values are checked on the client-side. They must have the <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_</code> prefix to be accessible in the browser.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
