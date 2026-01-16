import { Pool } from 'pg';

const requiredEnv = ['DATABASE_URL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required env: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
  console.error('Missing SESSION_SECRET or JWT_SECRET. Set one before launch.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });

const requiredTables = [
  'users',
  'boards',
  'generated_items',
  'favorites',
  'jobs',
];

const requiredUserColumns = [
  'email',
  'password_hash',
  'name',
  'company',
  'job_title',
  'referral_source',
  'avatar_url',
  'website_url',
  'overview',
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('select 1 as ok');
    const errors: string[] = [];

    const tablesResult = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])`,
      [requiredTables],
    );

    const tableSet = new Set(tablesResult.rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((table) => !tableSet.has(table));

    if (missingTables.length > 0) {
      errors.push(`Missing required tables: ${missingTables.join(', ')}`);
    }

    const columnsResult = await client.query(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'users'`,
    );

    const columnSet = new Set(columnsResult.rows.map((row) => row.column_name));
    const missingColumns = requiredUserColumns.filter((column) => !columnSet.has(column));

    if (missingColumns.length > 0) {
      errors.push(`Missing users columns: ${missingColumns.join(', ')}`);
    }

    if (errors.length > 0) {
      for (const message of errors) {
        console.error(message);
      }
      process.exitCode = 1;
      return;
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('Smoke test passed.');
}

run().catch((error) => {
  console.error('Smoke test failed.', error);
  process.exit(1);
});
