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

export interface ThemeTable {
  id: string;
  name: string;
}

export interface RpgClassTable {
  id: string;
  name: string;
}

export interface SystemTable {
  id: string;
  name: string;
}

export interface CharacterTable {
  id: string;
  id_profile: string;
  name: string;
  background: string | null;
  level: number;
  is_alive: boolean;
}

export interface Database {
  profiles: ProfileTable;
  themes: ThemeTable;
  classes: RpgClassTable;
  systems: SystemTable;
  characters: CharacterTable;
}

export type ProfileRow = Selectable<ProfileTable>;
export type NewProfileRow = Insertable<ProfileTable>;
export type ProfileRowUpdate = Updateable<ProfileTable>;

export type ThemeRow = Selectable<ThemeTable>;
export type RpgClassRow = Selectable<RpgClassTable>;
export type SystemRow = Selectable<SystemTable>;
export type CharacterRow = Selectable<CharacterTable>;
