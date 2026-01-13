import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'tables') {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      return NextResponse.json({ tables: result.rows.map(r => r.table_name) });
    }

    if (action === 'schema') {
      const tableName = searchParams.get('table');
      if (!tableName) {
        return NextResponse.json({ error: 'Table name required' }, { status: 400 });
      }
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      return NextResponse.json({ schema: result.rows });
    }

    return NextResponse.json({ 
      endpoints: {
        'GET /api/db?action=tables': 'List all tables',
        'GET /api/db?action=schema&table=tablename': 'Get table schema',
        'POST /api/db/query': 'Execute SELECT query',
        'POST /api/db/execute': 'Execute INSERT/UPDATE/DELETE',
        'POST /api/db/table': 'Create a new table',
        'DELETE /api/db/table?name=tablename': 'Drop a table',
        'GET /api/db/rows?table=tablename': 'Get all rows from table',
        'POST /api/db/rows': 'Insert row into table',
        'PUT /api/db/rows': 'Update row in table',
        'DELETE /api/db/rows?table=tablename&id=rowid': 'Delete row from table'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
