/**
 * Test Send Message to All Groups
 * GET /api/line/test-all-groups - ทดสอบส่งข้อความไปทุกกลุ่ม
 */

import { NextResponse } from 'next/server';
import { lineService } from '@/lib/line';

export const dynamic = 'force-dynamic';

const GROUPS = [
  { name: 'DB1', id: process.env.LINE_GROUP_DB1 },
  { name: 'DB2', id: process.env.LINE_GROUP_DB2 },
  { name: 'DB3', id: process.env.LINE_GROUP_DB3 },
  { name: 'DB4', id: process.env.LINE_GROUP_DB4 },
  { name: 'DB5', id: process.env.LINE_GROUP_DB5 },
  { name: 'DB6', id: process.env.LINE_GROUP_DB6 },
  { name: 'TEST', id: process.env.LINE_GROUP_TEST },
];

export async function GET() {
  try {
    if (!lineService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'LINE service not configured',
      }, { status: 500 });
    }

    console.log('\n🧪 Testing message send to all groups...\n');

    const results = [];
    const timestamp = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    for (const group of GROUPS) {
      if (!group.id) {
        results.push({
          group: group.name,
          status: 'skipped',
          reason: 'Group ID not configured',
        });
        continue;
      }

      console.log(`📤 Sending to ${group.name}...`);

      const success = await lineService.sendTextMessage(
        group.id,
        `🧪 Test Message - ${timestamp}\n\nGroup: ${group.name}\nTesting quota and connectivity.`
      );

      results.push({
        group: group.name,
        groupId: group.id,
        status: success ? 'success' : 'failed',
        timestamp,
      });

      console.log(`   ${success ? '✅' : '❌'} ${group.name}: ${success ? 'Success' : 'Failed'}`);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results,
      analysis: analyzeResults(results),
    });
  } catch (error: any) {
    console.error('Error in test-all-groups:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

function analyzeResults(results: any[]): string[] {
  const analysis: string[] = [];

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');

  if (successful.length > 0 && failed.length > 0) {
    analysis.push(
      `⚠️ MIXED RESULTS: ${successful.length} groups succeeded, ${failed.length} failed.`
    );
    analysis.push(
      `Working groups: ${successful.map(r => r.group).join(', ')}`
    );
    analysis.push(
      `Failed groups: ${failed.map(r => r.group).join(', ')}`
    );
    analysis.push(
      `This suggests per-group quota limits or selective quota exhaustion.`
    );
  } else if (successful.length === results.length) {
    analysis.push(
      `✅ ALL GROUPS WORKING! Monthly quota has been restored or increased.`
    );
  } else if (failed.length === results.length) {
    analysis.push(
      `❌ ALL GROUPS FAILING! Check LINE quota in Developers Console.`
    );
  }

  return analysis;
}
