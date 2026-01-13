import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@replit/object-storage';

const client = new Client();

const mimeTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const storageKey = decodeURIComponent(key);
    
    const { ok, value, error } = await client.downloadAsBytes(storageKey);
    
    if (!ok || !value) {
      return NextResponse.json(
        { error: error?.message || 'File not found' },
        { status: 404 }
      );
    }
    
    const extension = storageKey.split('.').pop()?.toLowerCase() || '';
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    return new NextResponse(value, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Storage download error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}
