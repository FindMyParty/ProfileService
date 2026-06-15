import { db } from './client.js';
import { System } from '../../../domain/entities/system.js';
import type { ISystemRepository } from '../../../domain/ports/outbound/system-repository.port.js';
import type { SystemRow } from './types.js';

export class PostgresSystemRepository implements ISystemRepository {
  #toEntity(row: SystemRow): System {
    return System.fromPersistence({ id: row.id, name: row.name });
  }

  async save(system: System): Promise<System> {
    const row = await db
      .insertInto('systems')
      .values({ id: system.id, name: system.name })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async findById(id: string): Promise<System | null> {
    const row = await db
      .selectFrom('systems')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    return this.#toEntity(row);
  }

  async findAll(): Promise<System[]> {
    const rows = await db.selectFrom('systems').selectAll().orderBy('name', 'asc').execute();
    return rows.map((row) => this.#toEntity(row));
  }
}
