
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Check if we are in a browser environment to prevent accidents, though this file should only be imported on server.
if (typeof window !== 'undefined') {
    throw new Error('This file should not be imported on the client.');
}

// Global pool handling for Next.js hot reloading in dev
const globalForDb = globalThis as unknown as {
    conn: Pool | undefined;
};

const pool = globalForDb.conn ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') globalForDb.conn = pool;

export const db = drizzle(pool, { schema });
