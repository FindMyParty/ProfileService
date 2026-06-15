import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely';

export interface ProfileTable {
  id: string;
  name: string;
  birthday: Date | null;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  last_login: Date | null;
  is_dm: boolean;
  is_player: boolean;
  is_active: boolean;
  is_remote: boolean;
  experience: string;
  created_at: ColumnType<Date, Date | undefined, never>;
  updated_at: ColumnType<Date, Date | undefined, Date>;
}

export interface Database {
  profiles: ProfileTable;
}

export type ProfileRow = Selectable<ProfileTable>;
export type NewProfileRow = Insertable<ProfileTable>;
export type ProfileRowUpdate = Updateable<ProfileTable>;
