/**
 * Cloud Storage Service
 * Uses Supabase Storage for file uploads
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'helpdesk-images';

// Lazy initialization
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: Buffer | File,
  fileName: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseClient();

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
 */
export async function deleteFile(fileName: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fileName]);

  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error(error.message);
  }
}

/**
 * Delete multiple files from Supabase Storage
 */
export async function deleteFiles(fileNames: string[]): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(fileNames);

  if (error) {
    console.error('Supabase delete multiple files error:', error);
    throw new Error(error.message);
  }
}

/**
 * Generate unique file name for uploads
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
 */
export function extractFileName(url: string): string {
  if (url.startsWith('http')) {
    const parts = url.split(`/${BUCKET_NAME}/`);
    return parts[1] || url;
  }
  return url;
}

/**
 * Check if URL is a data URL (base64)
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Convert data URL to Buffer
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
