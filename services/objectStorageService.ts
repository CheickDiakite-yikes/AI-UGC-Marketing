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

export async function uploadGeneratedItem(
  boardId: string,
  itemId: string,
  data: string,
  type: 'image' | 'video'
): Promise<UploadResult> {
  try {
    const extension = type === 'video' ? 'mp4' : 'png';
    const storageKey = `boards/${boardId}/generated/${itemId}.${extension}`;
    
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    const binaryData = Buffer.from(base64Data, 'base64');
    
    const validation = validateImageBuffer(binaryData, type);
    if (!validation.valid) {
      console.error(`[UPLOAD BLOCKED] Generated ${type} validation failed: ${validation.error}`);
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

export async function uploadCarouselSlide(
  boardId: string,
  itemId: string,
  slideIndex: number,
  data: string
): Promise<UploadResult> {
  try {
    const storageKey = `boards/${boardId}/generated/${itemId}_slide${slideIndex}.png`;
    
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    const binaryData = Buffer.from(base64Data, 'base64');
    
    const validation = validateImageBuffer(binaryData, 'image');
    if (!validation.valid) {
      console.error(`[UPLOAD BLOCKED] Carousel slide ${slideIndex} validation failed: ${validation.error}`);
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
