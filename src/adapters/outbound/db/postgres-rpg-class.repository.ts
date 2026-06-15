import { db } from './client.js';
import { RpgClass } from '../../../domain/entities/rpg-class.js';
import type { IRpgClassRepository } from '../../../domain/ports/outbound/rpg-class-repository.port.js';
import type { RpgClassRow } from './types.js';

export class PostgresRpgClassRepository implements IRpgClassRepository {
  #toEntity(row: RpgClassRow): RpgClass {
    return RpgClass.fromPersistence({ id: row.id, name: row.name });
  }

  async save(rpgClass: RpgClass): Promise<RpgClass> {
    const row = await db
      .insertInto('classes')
      .values({ id: rpgClass.id, name: rpgClass.name })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async findById(id: string): Promise<RpgClass | null> {
    const row = await db
      .selectFrom('classes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    return this.#toEntity(row);
  }

  async findAll(): Promise<RpgClass[]> {
    const rows = await db.selectFrom('classes').selectAll().orderBy('name', 'asc').execute();
    return rows.map((row) => this.#toEntity(row));
  }
}
