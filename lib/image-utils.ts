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
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions (max 1920x1920 to save storage)
        let width = img.width;
        let height = img.height;
        const maxSize = 1920;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
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
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress and convert multiple images to WebP
 * @param files - Array of image files
 * @param quality - WebP quality (0-1), default 0.8
 * @returns Promise<File[]> - Array of converted WebP files
 */
export async function convertImagesToWebP(
  files: File[],
  quality: number = 0.8
): Promise<File[]> {
  const convertPromises = files.map((file) => {
    // Skip if already WebP
    if (file.type === 'image/webp') {
      console.log(`[Image Utils] ${file.name} is already WebP, skipping conversion`);
      return Promise.resolve(file);
    }

    // Only convert images
    if (!file.type.startsWith('image/')) {
      console.warn(`[Image Utils] ${file.name} is not an image, skipping`);
      return Promise.resolve(file);
    }

    return convertToWebP(file, quality);
  });

  return Promise.all(convertPromises);
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
