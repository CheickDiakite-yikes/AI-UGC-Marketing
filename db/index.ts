
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (typeof window !== 'undefined') {
    throw new Error('This file should not be imported on the client.');
}

const globalForDb = globalThis as unknown as {
    pool: Pool | undefined;
    db: NodePgDatabase<typeof schema> | undefined;
};

function getDb(): NodePgDatabase<typeof schema> {
    if (!globalForDb.db) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        if (!globalForDb.pool) {
            globalForDb.pool = new Pool({ connectionString });
        }
        globalForDb.db = drizzle(globalForDb.pool, { schema });
    }
    return globalForDb.db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
    get(_, prop) {
        return (getDb() as any)[prop];
    }
});
