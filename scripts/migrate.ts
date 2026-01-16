import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Pool } from 'pg';
import path from 'node:path';
import { getSchemaIssues } from './schemaCheck';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const migrationsFolder = path.join(process.cwd(), 'drizzle');

async function run() {
  const migrations = readMigrationFiles({ migrationsFolder });
  await pool.query('create extension if not exists pgcrypto');

  let shouldMigrate = true;
  let shouldExitWithError = false;

  const client = await pool.connect();
  try {
    await client.query('create schema if not exists "drizzle"');
    await client.query(
      `create table if not exists "drizzle"."__drizzle_migrations" (
        id serial primary key,
        hash text not null,
        created_at bigint
      )`,
    );

    const migrationResult = await client.query(
      'select id from "drizzle"."__drizzle_migrations" limit 1',
    );

    if (migrationResult.rowCount === 0) {
      const tableCheck = await client.query(`select to_regclass('public.users') as name`);
      const usersTableExists = Boolean(tableCheck.rows[0]?.name);

      if (usersTableExists) {
        const { missingTables, missingUserColumns } = await getSchemaIssues(client);
        if (missingTables.length > 0 || missingUserColumns.length > 0) {
          if (missingTables.length > 0) {
            console.error(`Schema drift: missing tables: ${missingTables.join(', ')}`);
          }
          if (missingUserColumns.length > 0) {
            console.error(`Schema drift: missing users columns: ${missingUserColumns.join(', ')}`);
          }
          console.error('Run `npm run db:push` once to sync, then rerun migrations.');
          shouldMigrate = false;
          shouldExitWithError = true;
        } else {
          for (const migration of migrations) {
            await client.query(
              `insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`,
              [migration.hash, migration.folderMillis],
            );
          }
          console.log('Baseline applied: existing schema marked as migrated.');
          shouldMigrate = false;
        }
      }
    }
  } finally {
    client.release();
  }

  if (shouldMigrate) {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
  }

  await pool.end();

  if (shouldExitWithError) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Database migration failed.', error);
  process.exit(1);
});
