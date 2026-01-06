/*
 * One-off script to convert existing Customer.phone values to E.164 (+66...) using libphonenumber-js
 * Usage: ts-node scripts/migrate-phones-to-e164.ts
 */

import { prisma } from '@/lib/prisma';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

function toE164TH(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Already E.164
  if (/^\+\d{7,15}$/.test(s)) return s;
  const parsed = parsePhoneNumberFromString(s, 'TH');
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

async function main() {
  console.log('Starting customer phone migration to E.164 (TH) ...');
  const customers = await prisma.customer.findMany({ select: { id: true, phone: true, name: true } });
  console.log(`Found ${customers.length} customers.`);

  let updated = 0;
  let skipped = 0;
  const batchSize = 100;

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    const ops = batch.map(async (c) => {
      const e164 = toE164TH(c.phone);
      if (!e164 || e164 === c.phone) {
        skipped++;
        return null;
      }
      try {
        await prisma.customer.update({ where: { id: c.id }, data: { phone: e164 } });
        updated++;
      } catch (err: any) {
        // In case of unique constraint conflicts on phone, log and skip
        console.error(`Failed to update customer ${c.id} (${c.name}) from '${c.phone}' -> '${e164}':`, err?.message || err);
      }
      return null;
    });

    await Promise.all(ops);
    console.log(`Processed ${Math.min(i + batch.length, customers.length)} / ${customers.length} ...`);
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
