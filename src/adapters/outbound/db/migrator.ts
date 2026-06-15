import { Migrator, type MigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { db } from './client.js';
import { logger } from '../../../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Detect if running from compiled JS or directly from TS source via tsx.
// When running via tsx, import.meta.url ends with .ts.
const IS_DEV = new URL(import.meta.url).pathname.endsWith('.ts');
const MIGRATION_EXT = IS_DEV ? '.ts' : '.js';

const migrationProvider: MigrationProvider = {
  async getMigrations() {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrations: Awaited<ReturnType<MigrationProvider['getMigrations']>> = {};

    for (const file of files.filter((f) => f.endsWith(MIGRATION_EXT) && !f.endsWith('.d.ts'))) {
      const fileUrl = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
      const name = path.basename(file, MIGRATION_EXT);
      migrations[name] = await import(fileUrl) as Awaited<ReturnType<MigrationProvider['getMigrations']>>[string];
    }

    return migrations;
  },
};

export async function runMigrations(): Promise<void> {
  const migrator = new Migrator({ db, provider: migrationProvider });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      logger.info({ migration: result.migrationName }, 'Migration applied');
    } else if (result.status === 'Error') {
      logger.error({ migration: result.migrationName }, 'Migration failed');
    }
  }

  if (error) {
    throw error;
  }
}
