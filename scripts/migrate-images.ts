/**
 * Migration Script: Base64 Images → Supabase Storage
 *
 * This script migrates all base64-encoded images from the database
 * to Supabase Storage and updates the database with new URLs.
 *
 * Usage: npx ts-node scripts/migrate-images.ts
 */

import { PrismaClient } from '@prisma/client';
import { uploadFile, generateFileName, isStorageConfigured, dataUrlToBuffer, isDataUrl } from '../lib/storage';

const prisma = new PrismaClient();

async function migrateImages() {
  console.log('🚀 Starting image migration from base64 to Supabase Storage...\n');

  if (!isStorageConfigured()) {
    console.error('❌ Supabase Storage is not configured!');
    console.error('   Please check your environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  try {
    // Find all notes with images
    const notesWithImages = await prisma.note.findMany({
      where: {
        images: {
          isEmpty: false,
        },
      },
      include: {
        ticket: true,
      },
    });

    console.log(`📝 Found ${notesWithImages.length} notes with images\n`);

    let totalImages = 0;
    let migratedImages = 0;
    let skippedImages = 0;
    let failedImages = 0;

    for (const note of notesWithImages) {
      console.log(`Processing Note ${note.id} (Ticket: ${note.ticket.ticketNo})...`);

      const newImageUrls: string[] = [];

      for (const imageUrl of note.images) {
        totalImages++;

        // Skip if already a cloud URL
        if (!isDataUrl(imageUrl)) {
          console.log(`  ⏭️  Skipping (already cloud URL): ${imageUrl.substring(0, 50)}...`);
          newImageUrls.push(imageUrl);
          skippedImages++;
          continue;
        }

        try {
          // Convert base64 to buffer
          const { buffer, contentType } = dataUrlToBuffer(imageUrl);

          // Generate unique filename
          const extension = contentType.split('/')[1] || 'jpg';
          const fileName = generateFileName(note.ticketId, `image-${Date.now()}.${extension}`);

          // Upload to Supabase
          console.log(`  📤 Uploading: ${fileName}`);
          const publicUrl = await uploadFile(buffer, fileName, contentType);

          newImageUrls.push(publicUrl);
          migratedImages++;
          console.log(`  ✅ Migrated: ${publicUrl}`);
        } catch (error) {
          console.error(`  ❌ Failed to migrate image:`, error);
          // Keep old base64 URL as fallback
          newImageUrls.push(imageUrl);
          failedImages++;
        }
      }

      // Update note with new URLs
      if (newImageUrls.length > 0) {
        await prisma.note.update({
          where: { id: note.id },
          data: { images: newImageUrls },
        });
        console.log(`  💾 Updated note ${note.id} with new URLs\n`);
      }
    }

    console.log('\n✨ Migration completed!');
    console.log('─'.repeat(50));
    console.log(`Total images found:     ${totalImages}`);
    console.log(`✅ Successfully migrated: ${migratedImages}`);
    console.log(`⏭️  Skipped (already migrated): ${skippedImages}`);
    console.log(`❌ Failed:              ${failedImages}`);
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
