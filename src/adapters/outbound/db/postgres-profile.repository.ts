import { db } from './client.js';
import { Profile } from '../../../domain/entities/profile.js';
import type { AssociationItem } from '../../../domain/entities/profile.js';
import type { IProfileRepository } from '../../../domain/ports/outbound/profile-repository.port.js';
import { ValidationError } from '../../../shared/errors.js';

export class PostgresProfileRepository implements IProfileRepository {
  async #fetchAssociations(profileId: string): Promise<{
    classes: AssociationItem[];
    systems: AssociationItem[];
    themes: AssociationItem[];
  }> {
    const [classes, systems, themes] = await Promise.all([
      db
        .selectFrom('profile_classes')
        .innerJoin('classes', 'classes.id', 'profile_classes.id_classes')
        .where('profile_classes.id_profile', '=', profileId)
        .select(['classes.id', 'classes.name'])
        .execute(),
      db
        .selectFrom('profile_systems')
        .innerJoin('systems', 'systems.id', 'profile_systems.id_systems')
        .where('profile_systems.id_profile', '=', profileId)
        .select(['systems.id', 'systems.name'])
        .execute(),
      db
        .selectFrom('profile_themes')
        .innerJoin('themes', 'themes.id', 'profile_themes.id_themes')
        .where('profile_themes.id_profile', '=', profileId)
        .select(['themes.id', 'themes.name'])
        .execute(),
    ]);
    return { classes, systems, themes };
  }

  async save(profile: Profile): Promise<Profile> {
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('profiles')
          .values({
            id: profile.id,
            name: profile.name,
            birthday: profile.birthday,
            description: profile.description,
            latitude: profile.latitude !== null ? String(profile.latitude) : null,
            longitude: profile.longitude !== null ? String(profile.longitude) : null,
            last_login: profile.lastLogin,
            is_dm: profile.isDM,
            is_player: profile.isPlayer,
            is_active: profile.isActive,
            is_remote: profile.isRemote,
            experience: profile.experience,
            created_at: profile.createdAt,
            updated_at: profile.updatedAt,
          })
          .execute();

        if (profile.classIds && profile.classIds.length > 0) {
          await trx
            .insertInto('profile_classes')
            .values(profile.classIds.map((id) => ({ id_profile: profile.id, id_classes: id })))
            .execute();
        }
        if (profile.systemIds && profile.systemIds.length > 0) {
          await trx
            .insertInto('profile_systems')
            .values(profile.systemIds.map((id) => ({ id_profile: profile.id, id_systems: id })))
            .execute();
        }
        if (profile.themeIds && profile.themeIds.length > 0) {
          await trx
            .insertInto('profile_themes')
            .values(profile.themeIds.map((id) => ({ id_profile: profile.id, id_themes: id })))
            .execute();
        }
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23503') {
        throw new ValidationError('One or more provided class, system, or theme IDs do not exist');
      }
      throw err;
    }

    return (await this.findById(profile.id))!;
  }

  async findById(id: string): Promise<Profile | null> {
    const row = await db.selectFrom('profiles').selectAll().where('id', '=', id).executeTakeFirst();
    if (!row) return null;

    const associations = await this.#fetchAssociations(id);

    return Profile.fromPersistence(
      {
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
      },
      associations,
    );
  }

  async update(profile: Profile): Promise<Profile> {
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('profiles')
          .set({
            name: profile.name,
            birthday: profile.birthday,
            description: profile.description,
            latitude: profile.latitude !== null ? String(profile.latitude) : null,
            longitude: profile.longitude !== null ? String(profile.longitude) : null,
            is_dm: profile.isDM,
            is_player: profile.isPlayer,
            is_active: profile.isActive,
            is_remote: profile.isRemote,
            experience: profile.experience,
            updated_at: profile.updatedAt,
          })
          .where('id', '=', profile.id)
          .execute();

        if (profile.classIds !== undefined) {
          await trx.deleteFrom('profile_classes').where('id_profile', '=', profile.id).execute();
          if (profile.classIds.length > 0) {
            await trx
              .insertInto('profile_classes')
              .values(profile.classIds.map((id) => ({ id_profile: profile.id, id_classes: id })))
              .execute();
          }
        }
        if (profile.systemIds !== undefined) {
          await trx.deleteFrom('profile_systems').where('id_profile', '=', profile.id).execute();
          if (profile.systemIds.length > 0) {
            await trx
              .insertInto('profile_systems')
              .values(profile.systemIds.map((id) => ({ id_profile: profile.id, id_systems: id })))
              .execute();
          }
        }
        if (profile.themeIds !== undefined) {
          await trx.deleteFrom('profile_themes').where('id_profile', '=', profile.id).execute();
          if (profile.themeIds.length > 0) {
            await trx
              .insertInto('profile_themes')
              .values(profile.themeIds.map((id) => ({ id_profile: profile.id, id_themes: id })))
              .execute();
          }
        }
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23503') {
        throw new ValidationError('One or more provided class, system, or theme IDs do not exist');
      }
      throw err;
    }

    return (await this.findById(profile.id))!;
  }
}
