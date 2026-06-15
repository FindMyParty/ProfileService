import { z } from 'zod';

export const Experience = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  VETERAN: 'veteran',
} as const;

export type ExperienceType = (typeof Experience)[keyof typeof Experience];
export type AssociationItem = { id: string; name: string };

const profileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthday: z.date().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  lastLogin: z.date().nullable().optional(),
  isDM: z.boolean().default(false),
  isPlayer: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isRemote: z.boolean().default(false),
  experience: z.nativeEnum(Experience).default(Experience.BEGINNER),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createProfileSchema = profileSchema.omit({ createdAt: true, updatedAt: true }).extend({
  classIds: z.array(z.string().uuid()).optional().default([]),
  systemIds: z.array(z.string().uuid()).optional().default([]),
  themeIds: z.array(z.string().uuid()).optional().default([]),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthday: z.date().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isDM: z.boolean().optional(),
  isPlayer: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  experience: z.nativeEnum(Experience).optional(),
  classIds: z.array(z.string().uuid()).optional(),
  systemIds: z.array(z.string().uuid()).optional(),
  themeIds: z.array(z.string().uuid()).optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;
export type CreateProfileData = z.input<typeof createProfileSchema>;
export type UpdateProfileData = z.input<typeof updateProfileSchema>;

export class Profile {
  id: string;
  name: string;
  birthday: Date | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLogin: Date | null;
  isDM: boolean;
  isPlayer: boolean;
  isActive: boolean;
  isRemote: boolean;
  experience: ExperienceType;
  createdAt: Date;
  updatedAt: Date;
  classes: AssociationItem[];
  systems: AssociationItem[];
  themes: AssociationItem[];
  classIds?: string[];
  systemIds?: string[];
  themeIds?: string[];

  constructor(
    data: ProfileData,
    associations?: { classes?: AssociationItem[]; systems?: AssociationItem[]; themes?: AssociationItem[] },
    pendingIds?: { classIds?: string[]; systemIds?: string[]; themeIds?: string[] },
  ) {
    this.id = data.id;
    this.name = data.name;
    this.birthday = data.birthday ?? null;
    this.description = data.description ?? null;
    this.latitude = data.latitude ?? null;
    this.longitude = data.longitude ?? null;
    this.lastLogin = data.lastLogin ?? null;
    this.isDM = data.isDM;
    this.isPlayer = data.isPlayer;
    this.isActive = data.isActive;
    this.isRemote = data.isRemote;
    this.experience = data.experience;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.classes = associations?.classes ?? [];
    this.systems = associations?.systems ?? [];
    this.themes = associations?.themes ?? [];
    this.classIds = pendingIds?.classIds;
    this.systemIds = pendingIds?.systemIds;
    this.themeIds = pendingIds?.themeIds;
  }

  static create(data: unknown): Profile {
    const parsed = createProfileSchema.parse(data);
    const now = new Date();
    return new Profile(
      {
        id: parsed.id,
        name: parsed.name,
        birthday: parsed.birthday ?? null,
        description: parsed.description ?? null,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
        lastLogin: parsed.lastLogin ?? null,
        isDM: parsed.isDM,
        isPlayer: parsed.isPlayer,
        isActive: parsed.isActive,
        isRemote: parsed.isRemote,
        experience: parsed.experience,
        createdAt: now,
        updatedAt: now,
      },
      undefined,
      { classIds: parsed.classIds, systemIds: parsed.systemIds, themeIds: parsed.themeIds },
    );
  }

  static fromPersistence(
    row: {
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
      created_at: Date;
      updated_at: Date;
    },
    associations?: { classes?: AssociationItem[]; systems?: AssociationItem[]; themes?: AssociationItem[] },
  ): Profile {
    return new Profile(
      {
        id: row.id,
        name: row.name,
        birthday: row.birthday,
        description: row.description,
        latitude: row.latitude !== null ? parseFloat(row.latitude) : null,
        longitude: row.longitude !== null ? parseFloat(row.longitude) : null,
        lastLogin: row.last_login,
        isDM: row.is_dm,
        isPlayer: row.is_player,
        isActive: row.is_active,
        isRemote: row.is_remote,
        experience: row.experience as ExperienceType,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      associations,
    );
  }

  update(data: UpdateProfileData): this {
    const parsed = updateProfileSchema.parse(data);

    if (parsed.name !== undefined) this.name = parsed.name;
    if (parsed.birthday !== undefined) this.birthday = parsed.birthday ?? null;
    if (parsed.description !== undefined) this.description = parsed.description ?? null;
    if (parsed.latitude !== undefined) this.latitude = parsed.latitude ?? null;
    if (parsed.longitude !== undefined) this.longitude = parsed.longitude ?? null;
    if (parsed.isDM !== undefined) this.isDM = parsed.isDM;
    if (parsed.isPlayer !== undefined) this.isPlayer = parsed.isPlayer;
    if (parsed.isActive !== undefined) this.isActive = parsed.isActive;
    if (parsed.isRemote !== undefined) this.isRemote = parsed.isRemote;
    if (parsed.experience !== undefined) this.experience = parsed.experience;
    if (parsed.classIds !== undefined) this.classIds = parsed.classIds;
    if (parsed.systemIds !== undefined) this.systemIds = parsed.systemIds;
    if (parsed.themeIds !== undefined) this.themeIds = parsed.themeIds;

    this.updatedAt = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      birthday: this.birthday ? this.birthday.toISOString().split('T')[0] : null,
      description: this.description,
      latitude: this.latitude,
      longitude: this.longitude,
      lastLogin: this.lastLogin ? this.lastLogin.toISOString() : null,
      isDM: this.isDM,
      isPlayer: this.isPlayer,
      isActive: this.isActive,
      isRemote: this.isRemote,
      experience: this.experience,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      classes: this.classes,
      systems: this.systems,
      themes: this.themes,
    };
  }
}
