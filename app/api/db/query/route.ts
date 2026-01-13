import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/db';

export async function POST(request: NextRequest) {
  try {
    const { query, params = [] } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith('SELECT')) {
      return NextResponse.json({ error: 'Only SELECT queries allowed. Use /api/db/execute for mutations.' }, { status: 400 });
    }

    const result = await pool.query(query, params);
    return NextResponse.json({ 
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
