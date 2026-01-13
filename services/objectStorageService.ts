'use server';

import { Client } from '@replit/object-storage';

const client = new Client();

export interface UploadResult {
  success: boolean;
  storageKey?: string;
  error?: string;
}

function validateImageBuffer(buffer: Buffer, expectedType: 'image' | 'video' | 'any' = 'any'): { valid: boolean; error?: string } {
  if (buffer.length < 8) {
    return { valid: false, error: `Buffer too small: ${buffer.length} bytes (minimum 8 required)` };
  }
  
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isWebP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isMp4 = buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
  
  if (expectedType === 'image' && !isPng && !isJpeg && !isWebP && !isGif) {
    return { valid: false, error: 'Invalid image format: expected PNG, JPEG, WebP, or GIF' };
  }
  
  if (expectedType === 'video' && !isMp4) {
    return { valid: false, error: 'Invalid video format: expected MP4' };
  }
  
  if (expectedType === 'any' && !isPng && !isJpeg && !isWebP && !isGif && !isMp4) {
    return { valid: false, error: 'Unrecognized file format' };
  }
  
  return { valid: true };
}

export async function uploadAsset(
  boardId: string,
  assetId: string,
  data: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    const extension = mimeType.split('/')[1] || 'bin';
    const storageKey = `boards/${boardId}/assets/${assetId}.${extension}`;
    
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    const binaryData = Buffer.from(base64Data, 'base64');
    
    const validation = validateImageBuffer(binaryData, 'any');
    if (!validation.valid) {
      console.error(`[UPLOAD BLOCKED] Asset validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }
    
    const { ok, error } = await client.uploadFromBytes(storageKey, binaryData);
    
    if (!ok) {
      return { success: false, error: error?.message || 'Upload failed' };
    }
    
    return { success: true, storageKey };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function detectMimeFromBuffer(buffer: Buffer): string {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (buffer.length >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return 'video/mp4';
  return 'application/octet-stream';
}

function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
  };
  return mimeToExt[mimeType] || 'bin';
}

export async function uploadGeneratedItem(
  boardId: string,
  itemId: string,
  data: string,
  type: 'image' | 'video'
): Promise<UploadResult> {
  try {
    if (!data || data.length < 100) {
      console.error(`[UPLOAD BLOCKED] Empty or too-short data string (${data?.length || 0} chars)`);
      return { success: false, error: 'No valid image data provided' };
    }
    
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    
    if (!base64Data || base64Data.length < 100) {
      console.error(`[UPLOAD BLOCKED] Base64 data too short after split (${base64Data?.length || 0} chars)`);
      return { success: false, error: 'Invalid base64 data' };
    }
    
    const binaryData = Buffer.from(base64Data, 'base64');
    
    if (binaryData.length < 100) {
      console.error(`[UPLOAD BLOCKED] Binary data too small: ${binaryData.length} bytes (minimum 100 required)`);
      return { success: false, error: `Buffer too small: ${binaryData.length} bytes` };
    }
    
    const validation = validateImageBuffer(binaryData, type);
    if (!validation.valid) {
      console.error(`[UPLOAD BLOCKED] Generated ${type} validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }
    
    const detectedMime = detectMimeFromBuffer(binaryData);
    const extension = type === 'video' ? 'mp4' : getExtensionFromMime(detectedMime);
    const storageKey = `boards/${boardId}/generated/${itemId}.${extension}`;
    
    console.log(`[UPLOAD] Uploading ${type} to ${storageKey} (${binaryData.length} bytes, detected: ${detectedMime})`);
    
    const { ok, error } = await client.uploadFromBytes(storageKey, binaryData);
    
    if (!ok) {
      console.error(`[UPLOAD FAILED] ${storageKey}:`, error?.message);
      return { success: false, error: error?.message || 'Upload failed' };
    }
    
    console.log(`[UPLOAD SUCCESS] ${storageKey}`);
    return { success: true, storageKey };
  } catch (err) {
    console.error(`[UPLOAD ERROR]`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadCarouselSlide(
  boardId: string,
  itemId: string,
  slideIndex: number,
  data: string
): Promise<UploadResult> {
  try {
    if (!data || data.length < 100) {
      console.error(`[UPLOAD BLOCKED] Carousel slide ${slideIndex}: Empty or too-short data (${data?.length || 0} chars)`);
      return { success: false, error: 'No valid image data provided' };
    }
    
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    
    if (!base64Data || base64Data.length < 100) {
      console.error(`[UPLOAD BLOCKED] Carousel slide ${slideIndex}: Base64 too short (${base64Data?.length || 0} chars)`);
      return { success: false, error: 'Invalid base64 data' };
    }
    
    const binaryData = Buffer.from(base64Data, 'base64');
    
    if (binaryData.length < 100) {
      console.error(`[UPLOAD BLOCKED] Carousel slide ${slideIndex}: Binary too small (${binaryData.length} bytes)`);
      return { success: false, error: `Buffer too small: ${binaryData.length} bytes` };
    }
    
    const validation = validateImageBuffer(binaryData, 'image');
    if (!validation.valid) {
      console.error(`[UPLOAD BLOCKED] Carousel slide ${slideIndex} validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }
    
    const detectedMime = detectMimeFromBuffer(binaryData);
    const extension = getExtensionFromMime(detectedMime);
    const storageKey = `boards/${boardId}/generated/${itemId}_slide${slideIndex}.${extension}`;
    
    console.log(`[UPLOAD] Uploading carousel slide ${slideIndex} to ${storageKey} (${binaryData.length} bytes, detected: ${detectedMime})`);
    
    const { ok, error } = await client.uploadFromBytes(storageKey, binaryData);
    
    if (!ok) {
      console.error(`[UPLOAD FAILED] Carousel slide ${slideIndex}:`, error?.message);
      return { success: false, error: error?.message || 'Upload failed' };
    }
    
    console.log(`[UPLOAD SUCCESS] Carousel slide ${slideIndex}: ${storageKey}`);
    return { success: true, storageKey };
  } catch (err) {
    console.error(`[UPLOAD ERROR] Carousel slide ${slideIndex}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function downloadAsset(storageKey: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const { ok, value, error } = await client.downloadAsBytes(storageKey);
    
    if (!ok || !value) {
      return { success: false, error: error?.message || 'Download failed' };
    }
    
    return { success: true, data: Buffer.from(value as unknown as ArrayBuffer) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteAsset(storageKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { ok, error } = await client.delete(storageKey);
    
    if (!ok) {
      return { success: false, error: error?.message || 'Delete failed' };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPublicUrl(storageKey: string): Promise<string> {
  return `/api/storage/${encodeURIComponent(storageKey)}`;
}

export async function getAsset(storageKey: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const { ok, value, error } = await client.downloadAsBytes(storageKey);
    
    if (!ok || !value) {
      return { success: false, error: error?.message || 'Download failed' };
    }
    
    const base64Data = Buffer.from(value as unknown as ArrayBuffer).toString('base64');
    return { success: true, data: base64Data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
