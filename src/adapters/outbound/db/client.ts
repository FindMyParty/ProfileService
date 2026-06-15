import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { env } from '../../../config/env.js';
import type { Database } from './types.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export async function checkPostgres(): Promise<'ok'> {
  await sql`SELECT 1`.execute(db);
  return 'ok';
}

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
