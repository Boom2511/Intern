/**
 * Upload API - Handle image uploads to Supabase Storage
 * POST /api/upload
 * Accepts multipart/form-data with 'images' field
 * Returns array of public URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'ticket-images';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      );
    }

    console.log(`[Upload] Processing ${images.length} images`);

    // Upload images to Supabase Storage
    const uploadPromises = images.map(async (file) => {
      try {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop() || 'webp';
        const filename = `${timestamp}-${randomStr}.${ext}`;
        const filepath = `uploads/${filename}`;

        console.log(`[Upload] Uploading ${file.name} as ${filepath} (${(file.size / 1024).toFixed(2)} KB)`);

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filepath, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('[Upload] Supabase upload error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filepath);

        console.log(`[Upload] ✅ Uploaded ${filename}: ${urlData.publicUrl}`);

        return urlData.publicUrl;
      } catch (err: any) {
        console.error('[Upload] Failed to upload image:', err);
        throw err;
      }
    });

    const urls = await Promise.all(uploadPromises);

    console.log(`[Upload] ✅ Successfully uploaded ${urls.length} images`);

    return NextResponse.json({
      success: true,
      urls,
    });
  } catch (error: any) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
