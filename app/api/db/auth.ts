import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const validKey = process.env.DB_API_KEY;

  if (!validKey) {
    return NextResponse.json({ 
      error: 'DB_API_KEY not configured. Set this environment variable to enable API access.' 
    }, { status: 503 });
  }

  if (!apiKey || apiKey !== validKey) {
    return NextResponse.json({ error: 'Unauthorized. Provide valid API key in x-api-key header.' }, { status: 401 });
  }

  return null;
}
