import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { validateApiKey } from '../auth';

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const orderBy = searchParams.get('orderBy') || 'created_at';
    const order = searchParams.get('order') || 'DESC';
    
    if (!table) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM "${table}" ORDER BY "${orderBy}" ${order} LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    
    return NextResponse.json({ 
      rows: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const { table, data } = await request.json();
    
    if (!table || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Table name and data object required' }, { status: 400 });
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.map(c => `"${c}"`).join(', ');

    const query = `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    
    return NextResponse.json({ success: true, row: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const { table, id, idColumn = 'id', data } = await request.json();
    
    if (!table || !id || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Table name, id, and data object required' }, { status: 400 });
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

    const query = `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${columns.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, row: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');
    const idColumn = searchParams.get('idColumn') || 'id';
    
    if (!table || !id) {
      return NextResponse.json({ error: 'Table name and row id required' }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM "${table}" WHERE "${idColumn}" = $1 RETURNING *`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
