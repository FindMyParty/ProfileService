import { db } from './client.js';
import { Theme } from '../../../domain/entities/theme.js';
import type { IThemeRepository } from '../../../domain/ports/outbound/theme-repository.port.js';
import type { ThemeRow } from './types.js';

export class PostgresThemeRepository implements IThemeRepository {
  #toEntity(row: ThemeRow): Theme {
    return Theme.fromPersistence({ id: row.id, name: row.name });
  }

  async save(theme: Theme): Promise<Theme> {
    const row = await db
      .insertInto('themes')
      .values({ id: theme.id, name: theme.name })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async findById(id: string): Promise<Theme | null> {
    const row = await db
      .selectFrom('themes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    return this.#toEntity(row);
  }

  async findAll(): Promise<Theme[]> {
    const rows = await db.selectFrom('themes').selectAll().orderBy('name', 'asc').execute();
    return rows.map((row) => this.#toEntity(row));
  }
}
