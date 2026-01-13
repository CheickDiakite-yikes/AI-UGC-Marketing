'use server';

import { Client } from '@replit/object-storage';

const client = new Client();

export interface UploadResult {
  success: boolean;
  storageKey?: string;
  error?: string;
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
    
    return { success: true, data: value as Buffer };
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
