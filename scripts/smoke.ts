import { Pool } from 'pg';
import { getSchemaIssues } from './schemaCheck';

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

async function run() {
  const client = await pool.connect();
  try {
    await client.query('select 1 as ok');
    const errors: string[] = [];
    const { missingTables, missingUserColumns } = await getSchemaIssues(client);

    if (missingTables.length > 0) {
      errors.push(`Missing required tables: ${missingTables.join(', ')}`);
    }

    if (missingUserColumns.length > 0) {
      errors.push(`Missing users columns: ${missingUserColumns.join(', ')}`);
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
