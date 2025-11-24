/**
 * Cloud Storage Service
 * Uses Supabase Storage for file uploads
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'helpdesk-images';

// Lazy initialization - สร้าง client เมื่อใช้งานจริงเท่านั้น
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }

    // Debug log (ลบออกหลัง debug เสร็จ)
    console.log('Initializing Supabase client:', {
      url,
      keyPrefix: key.substring(0, 20) + '...',
      keyLength: key.length,
    });

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export async function uploadFile(
  file: Buffer | File,
  fileName: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseClient(); // ใช้ function แทน

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}


/**
 * Delete file from Supabase Storage
 * @param fileName - File path to delete
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param fileNames - Array of file paths to delete
 */
export async function deleteFiles(fileNames: string[]): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(fileNames);

    if (error) {
      console.error('Supabase delete multiple files error:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting files from Supabase:', error);
    throw new Error('Failed to delete files');
  }
}

/**
 * Generate unique file name for uploads
 * @param ticketId - Ticket ID
 * @param originalName - Original file name
 */
export function generateFileName(ticketId: string, originalName: string): string {
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `tickets/${ticketId}/${timestamp}-${sanitizedName}`;
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Extract file name from Supabase URL
 * @param url - Full Supabase storage URL
 */
export function extractFileName(url: string): string {
  if (url.startsWith('http')) {
    // Extract path from Supabase URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const parts = url.split(`/${BUCKET_NAME}/`);
    return parts[1] || url;
  }
  return url;
}

/**
 * Check if URL is a data URL (base64)
 * @param url - URL to check
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Convert data URL to Buffer
 * @param dataUrl - Data URL string
 */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL');
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  return { buffer, contentType };
}
