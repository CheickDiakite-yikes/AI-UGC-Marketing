import type { PoolClient } from 'pg';

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
  'onboarding_dismissed_at',
];

export async function getSchemaIssues(client: PoolClient) {
  const tablesResult = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [requiredTables],
  );

  const tableSet = new Set(tablesResult.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !tableSet.has(table));

  const columnsResult = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'users'`,
  );

  const columnSet = new Set(columnsResult.rows.map((row) => row.column_name));
  const missingUserColumns = requiredUserColumns.filter((column) => !columnSet.has(column));

  return { missingTables, missingUserColumns };
}
