/**
 * Image Utility Functions
 * Handles image compression and WebP conversion for LIFF uploads
 */

/**
 * Convert image file to WebP format with compression
 * @param file - Original image file
 * @param quality - WebP quality (0-1), default 0.8
 * @returns Promise<File> - Converted WebP file
 */
export async function convertToWebP(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let cleanedUp = false;

    // Cleanup function to prevent memory leaks
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      URL.revokeObjectURL(objectUrl);
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };

    img.onload = () => {
      // Create canvas with optimized context options
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false,
      });

      if (!ctx) {
        cleanup();
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate new dimensions (max 1920x1920 to save storage)
      let width = img.width;
      let height = img.height;
      const maxSize = 1920;

      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP
      canvas.toBlob(
        (blob) => {
          // Cleanup resources
          cleanup();
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            reject(new Error('Failed to convert image to WebP'));
            return;
          }

          // Create new File from blob
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: 'image/webp' }
          );

          console.log(`[Image Utils] Converted ${file.name}:`);
          console.log(`  Original: ${(file.size / 1024).toFixed(2)} KB`);
          console.log(`  WebP: ${(webpFile.size / 1024).toFixed(2)} KB`);
          console.log(`  Savings: ${(((file.size - webpFile.size) / file.size) * 100).toFixed(1)}%`);

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Check if file is HEIC/HEIF format
 */
function isHEIC(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

/**
 * Compress and convert multiple images to WebP
 * @param files - Array of image files
 * @param quality - WebP quality (0-1), default 0.8
 * @param concurrentLimit - Maximum number of concurrent conversions (default 3)
 * @returns Promise<{convertedFiles: File[], needsServerConversion: File[]}> - Converted files and files that need server-side conversion
 */
export async function convertImagesToWebP(
  files: File[],
  quality: number = 0.8,
  concurrentLimit: number = 3
): Promise<{ convertedFiles: File[]; needsServerConversion: File[] }> {
  const convertedFiles: File[] = [];
  const needsServerConversion: File[] = [];

  // Process files in batches to prevent memory overflow
  for (let i = 0; i < files.length; i += concurrentLimit) {
    const batch = files.slice(i, i + concurrentLimit);

    const batchPromises = batch.map(async (file) => {
      // Skip if already WebP
      if (file.type === 'image/webp') {
        console.log(`[Image Utils] ${file.name} is already WebP, skipping conversion`);
        return { status: 'converted', file };
      }

      // Handle HEIC/HEIF files (iPhone photos)
      const isHEICFile = isHEIC(file);
      if (isHEICFile) {
        console.log(`[Image Utils] ${file.name} is HEIC format - attempting client-side conversion`);
      }

      // Only convert images
      if (!file.type.startsWith('image/') && !isHEICFile) {
        console.warn(`[Image Utils] ${file.name} is not an image, skipping`);
        return { status: 'converted', file };
      }

      try {
        const converted = await convertToWebP(file, quality);

        // Check if HEIC conversion actually worked
        if (isHEICFile) {
          // If converted file is still very similar size to original, conversion likely failed
          const sizeRatio = converted.size / file.size;
          if (sizeRatio > 0.95 && converted.size === file.size) {
            console.warn(`[Image Utils] ${file.name} HEIC client-side conversion may have failed - marking for server conversion`);
            return { status: 'needs_server', file };
          }
          console.log(`[Image Utils] ${file.name} HEIC successfully converted on client`);
        }

        return { status: 'converted', file: converted };
      } catch (error) {
        console.error(`[Image Utils] Failed to convert ${file.name}:`, error);

        // If it's HEIC, mark for server-side conversion instead of returning original
        if (isHEICFile) {
          console.log(`[Image Utils] ${file.name} will be converted on server`);
          return { status: 'needs_server', file };
        }

        // For other formats, return original file
        return { status: 'converted', file };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Separate converted files from those that need server conversion
    batchResults.forEach((result) => {
      if (result.status === 'converted') {
        convertedFiles.push(result.file);
      } else if (result.status === 'needs_server') {
        needsServerConversion.push(result.file);
      }
    });

    // Log progress for large batches
    if (files.length > concurrentLimit) {
      console.log(`[Image Utils] Processed ${Math.min(i + concurrentLimit, files.length)}/${files.length} images`);
    }
  }

  console.log(`[Image Utils] Summary: ${convertedFiles.length} converted, ${needsServerConversion.length} need server conversion`);

  return { convertedFiles, needsServerConversion };
}

/**
 * Validate image file
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @returns boolean - True if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): {
  valid: boolean;
  error?: string;
} {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'ไฟล์ต้องเป็นรูปภาพเท่านั้น',
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `ไฟล์ต้องมีขนาดไม่เกิน ${maxSizeMB} MB`,
    };
  }

  return { valid: true };
}
