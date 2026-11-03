/**
 * LINE Groups Debugging Script
 * ตรวจสอบว่า Bot อยู่ในกลุ่มไหนบ้าง และดึงข้อมูลแต่ละกลุ่ม
 *
 * Usage: npx tsx scripts/debug-line-groups.ts
 */

// Load from .env if exists, otherwise use Vercel env vars
try {
  require('dotenv').config();
} catch {
  // dotenv not required in production
}

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.argv[2];

interface GroupConfig {
  name: string;
  envVar: string;
  groupId?: string;
}

// กำหนดกลุ่มทั้งหมดที่ต้องการตรวจสอบ
const GROUPS: GroupConfig[] = [
  { name: 'DB1 (D1)', envVar: 'LINE_GROUP_DB1', groupId: process.env.LINE_GROUP_DB1 },
  { name: 'DB2 (D2)', envVar: 'LINE_GROUP_DB2', groupId: process.env.LINE_GROUP_DB2 },
  { name: 'DB3 (D3)', envVar: 'LINE_GROUP_DB3', groupId: process.env.LINE_GROUP_DB3 },
  { name: 'DB4 (D4)', envVar: 'LINE_GROUP_DB4', groupId: process.env.LINE_GROUP_DB4 },
  { name: 'DB5 (นำจ่ายรถยนต์)', envVar: 'LINE_GROUP_DB5', groupId: process.env.LINE_GROUP_DB5 },
  { name: 'DB6 (บป)', envVar: 'LINE_GROUP_DB6', groupId: process.env.LINE_GROUP_DB6 },
  { name: 'TEST (ทดสอบ)', envVar: 'LINE_GROUP_TEST', groupId: process.env.LINE_GROUP_TEST },
];

interface GroupSummaryResponse {
  groupId: string;
  groupName: string;
  pictureUrl?: string;
}

interface GroupMembersCountResponse {
  count: number;
}

interface GroupCheckResult {
  name: string;
  groupId: string;
  status: 'success' | 'not_found' | 'forbidden' | 'error';
  groupName?: string;
  memberCount?: number;
  errorMessage?: string;
  statusCode?: number;
}

/**
 * ตรวจสอบข้อมูลกลุ่ม
 */
async function checkGroup(config: GroupConfig): Promise<GroupCheckResult> {
  const { name, groupId } = config;

  if (!groupId) {
    return {
      name,
      groupId: 'N/A',
      status: 'error',
      errorMessage: 'Group ID not configured in environment variables',
    };
  }

  console.log(`\n🔍 Checking ${name}...`);
  console.log(`   Group ID: ${groupId}`);

  try {
    // 1. Get group summary
    const summaryResponse = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    const summaryData = await summaryResponse.text();
    let groupSummary: GroupSummaryResponse | null = null;

    try {
      if (summaryData) {
        groupSummary = JSON.parse(summaryData);
      }
    } catch {
      // Not JSON
    }

    // Handle errors
    if (!summaryResponse.ok) {
      if (summaryResponse.status === 404) {
        return {
          name,
          groupId,
          status: 'not_found',
          errorMessage: 'Group not found or bot is not in the group',
          statusCode: 404,
        };
      } else if (summaryResponse.status === 403) {
        return {
          name,
          groupId,
          status: 'forbidden',
          errorMessage: 'Permission denied - bot may not have access',
          statusCode: 403,
        };
      } else {
        return {
          name,
          groupId,
          status: 'error',
          errorMessage: `HTTP ${summaryResponse.status}: ${summaryData}`,
          statusCode: summaryResponse.status,
        };
      }
    }

    // 2. Get member count
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
        const countData: GroupMembersCountResponse = await countResponse.json();
        memberCount = countData.count;
      }
    } catch {
      // Ignore member count errors
    }

    return {
      name,
      groupId,
      status: 'success',
      groupName: groupSummary?.groupName,
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

/**
 * แสดงผลลัพธ์
 */
function printResults(results: GroupCheckResult[]) {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    📊 GROUP CHECK RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');

  // Successful groups
  const successful = results.filter(r => r.status === 'success');
  if (successful.length > 0) {
    console.log('\n✅ GROUPS BOT CAN ACCESS (' + successful.length + '):');
    console.log('───────────────────────────────────────────────────────────────');
    successful.forEach(result => {
      console.log(`\n📍 ${result.name}`);
      console.log(`   Group ID:    ${result.groupId}`);
      console.log(`   Group Name:  ${result.groupName || 'N/A'}`);
      console.log(`   Members:     ${result.memberCount || 'Unknown'}`);
    });
  }

  // Not found groups
  const notFound = results.filter(r => r.status === 'not_found');
  if (notFound.length > 0) {
    console.log('\n\n❌ GROUPS NOT FOUND / BOT NOT IN GROUP (' + notFound.length + '):');
    console.log('───────────────────────────────────────────────────────────────');
    notFound.forEach(result => {
      console.log(`\n📍 ${result.name}`);
      console.log(`   Group ID: ${result.groupId}`);
      console.log(`   Error:    ${result.errorMessage}`);
    });
  }

  // Forbidden groups
  const forbidden = results.filter(r => r.status === 'forbidden');
  if (forbidden.length > 0) {
    console.log('\n\n🚫 GROUPS WITH PERMISSION DENIED (' + forbidden.length + '):');
    console.log('───────────────────────────────────────────────────────────────');
    forbidden.forEach(result => {
      console.log(`\n📍 ${result.name}`);
      console.log(`   Group ID: ${result.groupId}`);
      console.log(`   Error:    ${result.errorMessage}`);
    });
  }

  // Error groups
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.log('\n\n⚠️  GROUPS WITH ERRORS (' + errors.length + '):');
    console.log('───────────────────────────────────────────────────────────────');
    errors.forEach(result => {
      console.log(`\n📍 ${result.name}`);
      console.log(`   Group ID: ${result.groupId}`);
      console.log(`   Error:    ${result.errorMessage}`);
    });
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                         📈 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Groups Checked:     ${results.length}`);
  console.log(`✅ Accessible:            ${successful.length}`);
  console.log(`❌ Not Found:             ${notFound.length}`);
  console.log(`🚫 Forbidden:             ${forbidden.length}`);
  console.log(`⚠️  Errors:                ${errors.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Recommendations
  if (notFound.length > 0 || forbidden.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('───────────────────────────────────────────────────────────────');
    if (notFound.length > 0) {
      console.log('\n1. For "Not Found" groups:');
      console.log('   • Verify the Group ID is correct');
      console.log('   • Make sure the bot is added to the group');
      console.log('   • Check if the group still exists');
    }
    if (forbidden.length > 0) {
      console.log('\n2. For "Forbidden" groups:');
      console.log('   • Verify you\'re using the correct channel access token');
      console.log('   • Check bot permissions in LINE Developers Console');
      console.log('   • Make sure the bot is an active member of the group');
    }
    console.log('\n');
  }
}

/**
 * ทดสอบส่งข้อความไปกลุ่มที่เข้าถึงได้
 */
async function testSendMessage(result: GroupCheckResult): Promise<boolean> {
  if (result.status !== 'success') {
    return false;
  }

  console.log(`\n📤 Testing send message to ${result.name}...`);

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: result.groupId,
        messages: [
          {
            type: 'text',
            text: `🧪 Debug Test - ${new Date().toLocaleString('th-TH')}\n\nBot can access this group successfully!`,
          },
        ],
      }),
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log(`   ✅ Message sent successfully!`);
      return true;
    } else {
      console.log(`   ❌ Failed: HTTP ${response.status}`);
      console.log(`   Response: ${responseText}`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🤖 LINE Bot Groups Debugging Tool');
  console.log('═══════════════════════════════════════════════════════════════');

  // Check token
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('\n❌ ERROR: LINE_CHANNEL_ACCESS_TOKEN not found in environment variables!');
    console.log('\nMake sure you have a .env file with:');
    console.log('LINE_CHANNEL_ACCESS_TOKEN=your-token-here\n');
    process.exit(1);
  }

  console.log('\n🔑 Channel Access Token: ' + LINE_CHANNEL_ACCESS_TOKEN.substring(0, 20) + '...');
  console.log(`\n📋 Checking ${GROUPS.length} groups...\n`);

  // Check all groups
  const results: GroupCheckResult[] = [];
  for (const group of GROUPS) {
    const result = await checkGroup(group);
    results.push(result);

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print results
  printResults(results);

  // Ask if user wants to test sending messages
  const successfulGroups = results.filter(r => r.status === 'success');

  if (successfulGroups.length > 0) {
    console.log('\n🧪 SEND TEST MESSAGE?');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('Do you want to send a test message to accessible groups?');
    console.log('This will help verify that sending actually works.\n');
    console.log('Uncomment the code below to enable test sending.\n');

    // Uncomment to enable test sending:
    // console.log('\n📤 Sending test messages...\n');
    // for (const result of successfulGroups) {
    //   await testSendMessage(result);
    //   await new Promise(resolve => setTimeout(resolve, 2000));
    // }
  }
}

// Run
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
