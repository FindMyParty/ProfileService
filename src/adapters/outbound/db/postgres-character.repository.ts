import { db } from './client.js';
import { Character } from '../../../domain/entities/character.js';
import type { AssociationItem } from '../../../domain/entities/profile.js';
import type { ICharacterRepository } from '../../../domain/ports/outbound/character-repository.port.js';
import { ValidationError } from '../../../shared/errors.js';

type CharacterRow = {
  id: string;
  id_profile: string;
  name: string;
  background: string | null;
  level: number;
  is_alive: boolean;
  id_system: string | null;
  system_name: string | null;
};

async function fetchClasses(characterId: string): Promise<AssociationItem[]> {
  return db
    .selectFrom('characters_classes')
    .innerJoin('classes', 'classes.id', 'characters_classes.id_classes')
    .where('characters_classes.id_characters', '=', characterId)
    .select(['classes.id', 'classes.name'])
    .execute();
}

async function fetchClassesForMany(characterIds: string[]): Promise<Map<string, AssociationItem[]>> {
  if (characterIds.length === 0) return new Map();

  const rows = await db
    .selectFrom('characters_classes')
    .innerJoin('classes', 'classes.id', 'characters_classes.id_classes')
    .where('characters_classes.id_characters', 'in', characterIds)
    .select(['characters_classes.id_characters', 'classes.id', 'classes.name'])
    .execute();

  const map = new Map<string, AssociationItem[]>();
  for (const row of rows) {
    const list = map.get(row.id_characters) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.id_characters, list);
  }
  return map;
}

function toEntity(row: CharacterRow, classes: AssociationItem[]): Character {
  return Character.fromPersistence(
    {
      id: row.id,
      id_profile: row.id_profile,
      name: row.name,
      background: row.background,
      level: row.level,
      is_alive: row.is_alive,
      id_system: row.id_system ?? '',
    },
    {
      classes,
      system: row.id_system && row.system_name ? { id: row.id_system, name: row.system_name } : undefined,
    },
  );
}

const baseQuery = db
  .selectFrom('characters')
  .leftJoin('characters_systems', 'characters_systems.id_characters', 'characters.id')
  .leftJoin('systems', 'systems.id', 'characters_systems.id_systems')
  .select([
    'characters.id',
    'characters.id_profile',
    'characters.name',
    'characters.background',
    'characters.level',
    'characters.is_alive',
    'characters_systems.id_systems as id_system',
    'systems.name as system_name',
  ]);

export class PostgresCharacterRepository implements ICharacterRepository {
  async save(character: Character): Promise<Character> {
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('characters')
          .values({
            id: character.id,
            id_profile: character.idProfile,
            name: character.name,
            background: character.background,
            level: character.level,
            is_alive: character.isAlive,
          })
          .execute();

        if (character.pendingClassIds && character.pendingClassIds.length > 0) {
          await trx
            .insertInto('characters_classes')
            .values(character.pendingClassIds.map((id) => ({ id_characters: character.id, id_classes: id })))
            .execute();
        }

        await trx
          .insertInto('characters_systems')
          .values({ id_characters: character.id, id_systems: character.idSystem })
          .execute();
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23503') {
        throw new ValidationError('The provided class or system ID does not exist');
      }
      throw err;
    }

    return (await this.findById(character.id))!;
  }

  async findById(id: string): Promise<Character | null> {
    const row = (await baseQuery
      .where('characters.id', '=', id)
      .executeTakeFirst()) as CharacterRow | undefined;

    if (!row) return null;

    const classes = await fetchClasses(id);
    return toEntity(row, classes);
  }

  async findByProfileId(idProfile: string): Promise<Character[]> {
    const rows = (await baseQuery
      .where('characters.id_profile', '=', idProfile)
      .orderBy('characters.name', 'asc')
      .execute()) as CharacterRow[];

    if (rows.length === 0) return [];

    const classesMap = await fetchClassesForMany(rows.map((r) => r.id));
    return rows.map((row) => toEntity(row, classesMap.get(row.id) ?? []));
  }

  async update(character: Character): Promise<Character> {
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('characters')
          .set({
            name: character.name,
            background: character.background,
            level: character.level,
            is_alive: character.isAlive,
          })
          .where('id', '=', character.id)
          .execute();

        if (character.pendingClassIds !== undefined) {
          await trx
            .deleteFrom('characters_classes')
            .where('id_characters', '=', character.id)
            .execute();
          if (character.pendingClassIds.length > 0) {
            await trx
              .insertInto('characters_classes')
              .values(character.pendingClassIds.map((id) => ({ id_characters: character.id, id_classes: id })))
              .execute();
          }
        }

        if (character.pendingIdSystem !== undefined) {
          await trx
            .deleteFrom('characters_systems')
            .where('id_characters', '=', character.id)
            .execute();
          await trx
            .insertInto('characters_systems')
            .values({ id_characters: character.id, id_systems: character.pendingIdSystem })
            .execute();
        }
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23503') {
        throw new ValidationError('The provided class or system ID does not exist');
      }
      throw err;
    }

    return (await this.findById(character.id))!;
  }
}
