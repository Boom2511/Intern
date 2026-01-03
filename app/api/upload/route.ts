/**
 * Upload API - Handle image uploads to Supabase Storage
 * POST /api/upload
 * Accepts multipart/form-data with 'images' field
 * Returns array of public URLs
 *
 * Features:
 * - Automatic HEIC/HEIF to WebP conversion (server-side fallback)
 * - Image compression and resizing
 * - Supports multiple file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_BUCKET_NAME || "ticket-images";

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if file is HEIC/HEIF format
 */
function isHEIC(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

/**
 * Convert image to WebP using Sharp (supports HEIC)
 */
async function convertToWebP(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sharp can handle HEIC/HEIF natively
  return await sharp(buffer)
    .resize(1920, 1920, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "No images provided" },
        { status: 400 }
      );
    }

    console.log(`[Upload] Processing ${images.length} images`);

    // Upload images to Supabase Storage
    const uploadPromises = images.map(async (file, index) => {
      try {
        const isHEICFile = isHEIC(file);
        const originalSize = file.size;

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        // Force .webp extension for all images (including converted HEIC)
        const filename = `${timestamp}-${randomStr}.webp`;
        const filepath = `uploads/${filename}`;

        console.log(
          `[Upload] Processing ${file.name} (${(originalSize / 1024).toFixed(
            2
          )} KB)${isHEICFile ? " [HEIC - Server conversion]" : ""}`
        );

        let wasConverted = false;
        let buffer: Buffer;
        let currentType = "image/webp";

        // Check if file needs server-side conversion
        if (
          isHEICFile ||
          (file.type.startsWith("image/") && file.type !== "image/webp")
        ) {
          // Convert to WebP on server (handles HEIC + any other formats)
          try {
            buffer = await convertToWebP(file);
            wasConverted = true;
            console.log(
              `[Upload] ✅ Converted to WebP: ${file.name} (${(
                originalSize / 1024
              ).toFixed(2)} KB → ${(buffer.length / 1024).toFixed(2)} KB)`
            );
          } catch (conversionError: any) {
            console.error(
              `[Upload] ⚠️ Conversion failed for ${file.name}, uploading original:`,
              conversionError.message
            );
            // Fallback to original file
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            currentType = file.type;
          }
        } else {
          // Already WebP or not an image, use as-is
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filepath, buffer, {
            contentType: currentType,
            upsert: false,
          });

        if (error) {
          console.error("[Upload] Supabase upload error:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filepath);

        const savings = wasConverted
          ? (((originalSize - buffer.length) / originalSize) * 100).toFixed(1)
          : "0";
        console.log(
          `[Upload] ✅ Uploaded [${index + 1}/${
            images.length
          }] ${filename} (savings: ${savings}%)`
        );

        return urlData.publicUrl;
      } catch (err: any) {
        console.error("[Upload] Failed to upload image:", err);
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
    console.error("[Upload] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
