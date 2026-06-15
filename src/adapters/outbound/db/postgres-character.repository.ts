import { db } from './client.js';
import { Character } from '../../../domain/entities/character.js';
import type { ICharacterRepository } from '../../../domain/ports/outbound/character-repository.port.js';
import type { CharacterRow } from './types.js';

export class PostgresCharacterRepository implements ICharacterRepository {
  #toEntity(row: CharacterRow): Character {
    return Character.fromPersistence({
      id: row.id,
      id_profile: row.id_profile,
      name: row.name,
      background: row.background,
      level: row.level,
      is_alive: row.is_alive,
    });
  }

  async save(character: Character): Promise<Character> {
    const row = await db
      .insertInto('characters')
      .values({
        id: character.id,
        id_profile: character.idProfile,
        name: character.name,
        background: character.background,
        level: character.level,
        is_alive: character.isAlive,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async findById(id: string): Promise<Character | null> {
    const row = await db
      .selectFrom('characters')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    return this.#toEntity(row);
  }

  async findByProfileId(idProfile: string): Promise<Character[]> {
    const rows = await db
      .selectFrom('characters')
      .selectAll()
      .where('id_profile', '=', idProfile)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((row) => this.#toEntity(row));
  }
}
