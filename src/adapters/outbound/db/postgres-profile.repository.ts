import { db } from './client.js';
import { Profile } from '../../../domain/entities/profile.js';
import type { IProfileRepository } from '../../../domain/ports/outbound/profile-repository.port.js';
import type { ProfileRow } from './types.js';

export class PostgresProfileRepository implements IProfileRepository {
  #toEntity(row: ProfileRow): Profile {
    return Profile.fromPersistence({
      id: row.id,
      name: row.name,
      birthday: row.birthday,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      last_login: row.last_login,
      is_dm: row.is_dm,
      is_player: row.is_player,
      is_active: row.is_active,
      is_remote: row.is_remote,
      experience: row.experience,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  async save(profile: Profile): Promise<Profile> {
    const data = profile.toJSON();
    const row = await db
      .insertInto('profiles')
      .values({
        id: data.id,
        name: data.name,
        birthday: data.birthday ? new Date(data.birthday) : null,
        description: data.description,
        latitude: data.latitude !== null ? String(data.latitude) : null,
        longitude: data.longitude !== null ? String(data.longitude) : null,
        last_login: data.lastLogin ? new Date(data.lastLogin) : null,
        is_dm: data.isDM,
        is_player: data.isPlayer,
        is_active: data.isActive,
        is_remote: data.isRemote,
        experience: data.experience,
        created_at: new Date(data.createdAt),
        updated_at: new Date(data.updatedAt),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.#toEntity(row);
  }

  async findById(id: string): Promise<Profile | null> {
    const row = await db
      .selectFrom('profiles')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) return null;
    return this.#toEntity(row);
  }

  async update(profile: Profile): Promise<Profile> {
    const data = profile.toJSON();
    const row = await db
      .updateTable('profiles')
      .set({
        name: data.name,
        birthday: data.birthday ? new Date(data.birthday) : null,
        description: data.description,
        latitude: data.latitude !== null ? String(data.latitude) : null,
        longitude: data.longitude !== null ? String(data.longitude) : null,
        is_dm: data.isDM,
        is_player: data.isPlayer,
        is_active: data.isActive,
        is_remote: data.isRemote,
        experience: data.experience,
        updated_at: new Date(data.updatedAt),
      })
      .where('id', '=', data.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.#toEntity(row);
  }
}
