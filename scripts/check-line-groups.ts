/**
 * Script to check LINE group information
 * Helps debug why some groups work and others don't
 */

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const GROUPS = {
  DB1: process.env.LINE_GROUP_DB1,
  DB2: process.env.LINE_GROUP_DB2,
  DB3: process.env.LINE_GROUP_DB3,
  DB4: process.env.LINE_GROUP_DB4,
  DB5: process.env.LINE_GROUP_DB5,
  DB6: process.env.LINE_GROUP_DB6,
  TEST: process.env.LINE_GROUP_TEST,
};

async function checkGroup(name: string, groupId: string) {
  console.log(`\n=== Checking ${name} (${groupId}) ===`);

  try {
    // Try to get group summary (this API is available)
    const response = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    const data = await response.text();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);

    if (response.ok) {
      console.log(`✅ ${name}: Group exists and bot has access`);
    } else if (response.status === 404) {
      console.log(`❌ ${name}: Group not found or bot not in group`);
    } else if (response.status === 403) {
      console.log(`⚠️ ${name}: Permission denied - might be using wrong token`);
    } else {
      console.log(`⚠️ ${name}: Unexpected status ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ ${name}: Error -`, error.message);
  }
}

async function main() {
  console.log('LINE Channel Token:', LINE_CHANNEL_ACCESS_TOKEN?.substring(0, 20) + '...');

  for (const [name, groupId] of Object.entries(GROUPS)) {
    if (groupId) {
      await checkGroup(name, groupId);
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(`\n⚠️ ${name}: No group ID configured`);
    }
  }

  console.log('\n=== Summary ===');
  console.log('If TEST shows different behavior than DB1-DB6,');
  console.log('it might indicate TEST is in a different bot/channel.');
}

main().catch(console.error);
