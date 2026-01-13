import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/db';

export async function POST(request: NextRequest) {
  try {
    const { query, params = [] } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const result = await pool.query(query, params);
    return NextResponse.json({ 
      success: true,
      rowCount: result.rowCount,
      rows: result.rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
