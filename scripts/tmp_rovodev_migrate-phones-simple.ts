/**
 * Simple Migration Script: Convert all recipientPhone fields to E.164 format
 * Run with: npx tsx scripts/tmp_rovodev_migrate-phones-simple.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Simple phone normalization without external libraries
 * Converts Thai phone numbers to E.164 format
 */
function simpleNormalizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all spaces, dashes, parentheses, and other formatting
  let cleaned = phone.toString().trim().replace(/[\s\-\(\)\.\+]/g, '');
  
  // If already starts with 66 (Thai country code without +)
  if (cleaned.startsWith('66') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  // If starts with 0 (Thai local format)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+66' + cleaned.substring(1);
  }
  
  // If starts with +66 (already E.164)
  if (cleaned.startsWith('+66')) {
    return phone.trim();
  }
  
  // If it's 9 digits (missing leading 0)
  if (cleaned.length === 9 && /^\d{9}$/.test(cleaned)) {
    return '+66' + cleaned;
  }
  
  return null;
}

async function migrateRecipientPhonesToE164() {
  console.log('🔄 Starting migration of recipientPhone to E.164 format...\n');

  try {
    // Fetch all tickets
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        recipientPhone: true,
      },
    });

    console.log(`📊 Found ${tickets.length} tickets to process\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const ticket of tickets) {
      const originalPhone = ticket.recipientPhone;

      // Skip if already in E.164 format
      if (originalPhone.startsWith('+66')) {
        skipCount++;
        continue;
      }

      try {
        const e164Phone = simpleNormalizePhone(originalPhone);

        if (e164Phone) {
          // Update ticket
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { recipientPhone: e164Phone },
          });

          console.log(`✅ ${ticket.id}: ${originalPhone} → ${e164Phone}`);
          successCount++;
        } else {
          console.log(`⚠️  ${ticket.id}: Invalid phone number - ${originalPhone}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`❌ ${ticket.id}: Failed to convert ${originalPhone} - ${error}`);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully converted: ${successCount}`);
    console.log(`   ⏭️  Already E.164 (skipped): ${skipCount}`);
    console.log(`   ❌ Failed to convert: ${errorCount}`);
    console.log(`   📊 Total processed: ${tickets.length}`);

    console.log('\n✨ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRecipientPhonesToE164()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
