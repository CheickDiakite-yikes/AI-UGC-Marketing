import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  await pool.query('create extension if not exists pgcrypto');
  const db = drizzle(pool);
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  await migrate(db, { migrationsFolder });
  await pool.end();
}

run().catch((error) => {
  console.error('Database migration failed.', error);
  process.exit(1);
});
