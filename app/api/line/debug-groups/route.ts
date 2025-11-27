/**
 * LINE Groups Debug API
 * GET /api/line/debug-groups - ตรวจสอบว่า Bot อยู่ในกลุ่มไหนบ้าง
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

interface GroupConfig {
  name: string;
  groupId?: string;
}

const GROUPS: GroupConfig[] = [
  { name: 'DB1 (D1)', groupId: process.env.LINE_GROUP_DB1 },
  { name: 'DB2 (D2)', groupId: process.env.LINE_GROUP_DB2 },
  { name: 'DB3 (D3)', groupId: process.env.LINE_GROUP_DB3 },
  { name: 'DB4 (D4)', groupId: process.env.LINE_GROUP_DB4 },
  { name: 'DB5 (นำจ่ายรถยนต์)', groupId: process.env.LINE_GROUP_DB5 },
  { name: 'DB6 (บป)', groupId: process.env.LINE_GROUP_DB6 },
  { name: 'TEST (ทดสอบ)', groupId: process.env.LINE_GROUP_TEST },
];

interface GroupCheckResult {
  name: string;
  groupId: string;
  status: 'success' | 'not_found' | 'forbidden' | 'error' | 'not_configured';
  groupName?: string;
  memberCount?: number;
  errorMessage?: string;
  statusCode?: number;
}

async function checkGroup(config: GroupConfig): Promise<GroupCheckResult> {
  const { name, groupId } = config;

  if (!groupId) {
    return {
      name,
      groupId: 'N/A',
      status: 'not_configured',
      errorMessage: 'Group ID not set in environment variables',
    };
  }

  try {
    // Get group summary
    const summaryResponse = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    if (!summaryResponse.ok) {
      if (summaryResponse.status === 404) {
        return {
          name,
          groupId,
          status: 'not_found',
          errorMessage: 'Group not found or bot not in group',
          statusCode: 404,
        };
      } else if (summaryResponse.status === 403) {
        return {
          name,
          groupId,
          status: 'forbidden',
          errorMessage: 'Permission denied',
          statusCode: 403,
        };
      } else {
        const errorText = await summaryResponse.text();
        return {
          name,
          groupId,
          status: 'error',
          errorMessage: `HTTP ${summaryResponse.status}: ${errorText}`,
          statusCode: summaryResponse.status,
        };
      }
    }

    const summaryData = await summaryResponse.json();

    // Get member count
    let memberCount: number | undefined;
    try {
      const countResponse = await fetch(
        `https://api.line.me/v2/bot/group/${groupId}/members/count`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          },
        }
      );

      if (countResponse.ok) {
        const countData = await countResponse.json();
        memberCount = countData.count;
      }
    } catch {
      // Ignore
    }

    return {
      name,
      groupId,
      status: 'success',
      groupName: summaryData.groupName,
      memberCount,
    };
  } catch (error: any) {
    return {
      name,
      groupId,
      status: 'error',
      errorMessage: error.message || String(error),
    };
  }
}

export async function GET() {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured',
      }, { status: 500 });
    }

    console.log('\n🔍 Starting LINE groups debug check...\n');

    // Check all groups
    const results: GroupCheckResult[] = [];
    for (const group of GROUPS) {
      const result = await checkGroup(group);
      results.push(result);
      console.log(`${result.status === 'success' ? '✅' : '❌'} ${result.name}: ${result.status}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Calculate summary
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      notFound: results.filter(r => r.status === 'not_found').length,
      forbidden: results.filter(r => r.status === 'forbidden').length,
      notConfigured: results.filter(r => r.status === 'not_configured').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      results,
      recommendations: generateRecommendations(results),
    });
  } catch (error: any) {
    console.error('Error in debug-groups:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

function generateRecommendations(results: GroupCheckResult[]): string[] {
  const recommendations: string[] = [];

  const notFound = results.filter(r => r.status === 'not_found');
  const forbidden = results.filter(r => r.status === 'forbidden');
  const notConfigured = results.filter(r => r.status === 'not_configured');

  if (notFound.length > 0) {
    recommendations.push(
      `${notFound.length} group(s) not found. ` +
      'Verify Group IDs are correct and bot is added to these groups: ' +
      notFound.map(r => r.name).join(', ')
    );
  }

  if (forbidden.length > 0) {
    recommendations.push(
      `${forbidden.length} group(s) show permission denied. ` +
      'Check if you\'re using the correct channel access token for: ' +
      forbidden.map(r => r.name).join(', ')
    );
  }

  if (notConfigured.length > 0) {
    recommendations.push(
      `${notConfigured.length} group(s) not configured in environment variables: ` +
      notConfigured.map(r => r.name).join(', ')
    );
  }

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');

  if (successful.length > 0 && failed.length > 0) {
    recommendations.push(
      '⚠️ CRITICAL: Some groups work and some don\'t with the same token. ' +
      `Working: ${successful.map(r => r.name).join(', ')}. ` +
      `Not working: ${failed.map(r => r.name).join(', ')}. ` +
      'This suggests failed groups may be in a DIFFERENT LINE bot/channel.'
    );
  }

  return recommendations;
}
