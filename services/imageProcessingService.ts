'use server';

import sharp from 'sharp';

const MAX_IMAGE_DIMENSION = 2048;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB max for Gemini inline data

interface ProcessedImage {
  base64: string;
  mimeType: string;
  originalSize: number;
  processedSize: number;
  wasResized: boolean;
}

function detectMimeTypeFromBase64(base64: string): string {
  const buffer = Buffer.from(base64.slice(0, 32), 'base64');
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  
  return 'image/png'; // Default fallback
}

export async function processImageForGemini(
  base64Data: string,
  storedMimeType?: string | null,
  traceId?: string
): Promise<ProcessedImage> {
  const logPrefix = traceId ? `[IMG-PROCESS ${traceId}]` : '[IMG-PROCESS]';
  
  // Strip data URI prefix if present
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const originalBuffer = Buffer.from(cleanBase64, 'base64');
  const originalSize = originalBuffer.length;
  
  // Detect actual MIME type from bytes
  const detectedMimeType = detectMimeTypeFromBase64(cleanBase64);
  const actualMimeType = detectedMimeType;
  
  if (storedMimeType && storedMimeType !== detectedMimeType) {
    console.log(`${logPrefix} MIME type mismatch: stored=${storedMimeType}, detected=${detectedMimeType}`);
  }
  
  console.log(`${logPrefix} Original size: ${(originalSize / 1024).toFixed(1)} KB, type: ${actualMimeType}`);
  
  // If image is small enough, just return with correct MIME type
  if (originalSize <= MAX_IMAGE_BYTES) {
    try {
      // Still process through sharp to ensure valid image and get correct format
      const image = sharp(originalBuffer);
      const metadata = await image.metadata();
      
      // Only resize if dimensions are too large
      if (metadata.width && metadata.height && 
          (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
        console.log(`${logPrefix} Resizing from ${metadata.width}x${metadata.height}`);
        
        const resized = await image
          .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        console.log(`${logPrefix} Resized: ${(resized.length / 1024).toFixed(1)} KB`);
        
        return {
          base64: resized.toString('base64'),
          mimeType: 'image/jpeg',
          originalSize,
          processedSize: resized.length,
          wasResized: true
        };
      }
      
      // No resize needed, but convert to JPEG if it's a PNG to reduce size
      if (actualMimeType === 'image/png' && originalSize > 500 * 1024) {
        const converted = await image.jpeg({ quality: 90 }).toBuffer();
        console.log(`${logPrefix} PNG->JPEG: ${(originalSize / 1024).toFixed(1)} KB -> ${(converted.length / 1024).toFixed(1)} KB`);
        
        return {
          base64: converted.toString('base64'),
          mimeType: 'image/jpeg',
          originalSize,
          processedSize: converted.length,
          wasResized: true
        };
      }
      
      return {
        base64: cleanBase64,
        mimeType: actualMimeType,
        originalSize,
        processedSize: originalSize,
        wasResized: false
      };
    } catch (err) {
      console.error(`${logPrefix} Sharp processing failed, using original:`, err);
      return {
        base64: cleanBase64,
        mimeType: actualMimeType,
        originalSize,
        processedSize: originalSize,
        wasResized: false
      };
    }
  }
  
  // Image is too large, must resize/compress
  console.log(`${logPrefix} Image too large (${(originalSize / 1024 / 1024).toFixed(2)} MB), resizing...`);
  
  try {
    const image = sharp(originalBuffer);
    const metadata = await image.metadata();
    
    console.log(`${logPrefix} Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Resize to max dimension and convert to JPEG for smaller size
    const resized = await image
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    console.log(`${logPrefix} Processed: ${(resized.length / 1024).toFixed(1)} KB`);
    
    return {
      base64: resized.toString('base64'),
      mimeType: 'image/jpeg',
      originalSize,
      processedSize: resized.length,
      wasResized: true
    };
  } catch (err) {
    console.error(`${logPrefix} Failed to resize large image:`, err);
    throw new Error(`Failed to process large image: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
