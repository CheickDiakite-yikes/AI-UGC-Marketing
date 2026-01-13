import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@replit/object-storage';

const client = new Client();

function detectMimeType(buffer: Uint8Array): string {
  if (buffer.length < 12) return 'application/octet-stream';
  
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return 'video/mp4';
  }
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  
  return 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const storageKey = decodeURIComponent(key);
    
    const { ok, value, error } = await client.downloadAsBytes(storageKey);
    
    if (!ok || !value) {
      console.error(`[STORAGE] File not found: ${storageKey}`, error?.message);
      return NextResponse.json(
        { error: error?.message || 'File not found' },
        { status: 404 }
      );
    }
    
    const buffer = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer);
    const contentType = detectMimeType(buffer);
    
    console.log(`[STORAGE] Serving ${storageKey} as ${contentType} (${buffer.length} bytes)`);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[STORAGE] Download error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}
