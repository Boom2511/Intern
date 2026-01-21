/**
 * Migration Script: Convert all recipientPhone fields to E.164 format
 * Run with: npx tsx scripts/migrate-recipient-phones-to-e164.ts
 */

import { PrismaClient } from '@prisma/client';
import { normalizePhoneToE164 } from '../lib/validations';

const prisma = new PrismaClient();

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
        // Parse and convert to E.164 using normalizePhoneToE164
        const e164Phone = normalizePhoneToE164(originalPhone, 'TH');

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
