import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/db';

export async function POST(request: NextRequest) {
  try {
    const { name, columns } = await request.json();
    
    if (!name || !columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ 
        error: 'Table name and columns array required',
        example: {
          name: 'my_table',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
            { name: 'name', type: 'text', nullable: false },
            { name: 'created_at', type: 'timestamp', default: 'now()' }
          ]
        }
      }, { status: 400 });
    }

    const columnDefs = columns.map((col: any) => {
      let def = `"${col.name}" ${col.type}`;
      if (col.primary) def += ' PRIMARY KEY';
      if (col.nullable === false) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.default) def += ` DEFAULT ${col.default}`;
      return def;
    }).join(', ');

    const query = `CREATE TABLE IF NOT EXISTS "${name}" (${columnDefs})`;
    await pool.query(query);
    
    return NextResponse.json({ success: true, message: `Table "${name}" created`, query });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    }

    await pool.query(`DROP TABLE IF EXISTS "${name}" CASCADE`);
    return NextResponse.json({ success: true, message: `Table "${name}" dropped` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
