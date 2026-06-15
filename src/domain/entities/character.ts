import { z } from 'zod';
import type { AssociationItem } from './profile.js';

const characterSchema = z.object({
  id: z.string().uuid(),
  idProfile: z.string().uuid(),
  name: z.string().min(1).max(255),
  background: z.string().max(500).nullable().optional(),
  level: z.number().int().min(1).max(20).default(1),
  isAlive: z.boolean().default(true),
});

const createCharacterSchema = characterSchema.omit({ id: true }).extend({
  classIds: z.array(z.string().uuid()).min(1),
  idSystem: z.string().uuid(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  background: z.string().max(500).nullable().optional(),
  level: z.number().int().min(1).max(20).optional(),
  isAlive: z.boolean().optional(),
  classIds: z.array(z.string().uuid()).min(1).optional(),
  idSystem: z.string().uuid().optional(),
});

export type CharacterData = z.infer<typeof characterSchema>;
export type CreateCharacterData = z.input<typeof createCharacterSchema>;
export type UpdateCharacterData = z.input<typeof updateCharacterSchema>;

export class Character {
  id: string;
  idProfile: string;
  name: string;
  background: string | null;
  level: number;
  isAlive: boolean;
  idSystem: string;
  classes: AssociationItem[];
  system: AssociationItem | null;
  pendingClassIds?: string[];
  pendingIdSystem?: string;

  constructor(
    data: CharacterData & { idSystem: string },
    associations?: { classes?: AssociationItem[]; system?: AssociationItem },
    pendingIds?: { classIds?: string[]; idSystem?: string },
  ) {
    this.id = data.id;
    this.idProfile = data.idProfile;
    this.name = data.name;
    this.background = data.background ?? null;
    this.level = data.level;
    this.isAlive = data.isAlive;
    this.idSystem = data.idSystem;
    this.classes = associations?.classes ?? [];
    this.system = associations?.system ?? null;
    this.pendingClassIds = pendingIds?.classIds;
    this.pendingIdSystem = pendingIds?.idSystem;
  }

  static create(data: unknown): Character {
    const parsed = createCharacterSchema.parse(data);
    return new Character(
      { ...parsed, id: crypto.randomUUID() },
      undefined,
      { classIds: parsed.classIds },
    );
  }

  static fromPersistence(
    row: {
      id: string;
      id_profile: string;
      name: string;
      background: string | null;
      level: number;
      is_alive: boolean;
      id_system: string;
    },
    associations?: { classes?: AssociationItem[]; system?: AssociationItem },
  ): Character {
    return new Character(
      {
        id: row.id,
        idProfile: row.id_profile,
        name: row.name,
        background: row.background,
        level: row.level,
        isAlive: row.is_alive,
        idSystem: row.id_system,
      },
      associations,
    );
  }

  update(data: UpdateCharacterData): this {
    const parsed = updateCharacterSchema.parse(data);
    if (parsed.name !== undefined) this.name = parsed.name;
    if (parsed.background !== undefined) this.background = parsed.background ?? null;
    if (parsed.level !== undefined) this.level = parsed.level;
    if (parsed.isAlive !== undefined) this.isAlive = parsed.isAlive;
    if (parsed.classIds !== undefined) this.pendingClassIds = parsed.classIds;
    if (parsed.idSystem !== undefined) this.pendingIdSystem = parsed.idSystem;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      idProfile: this.idProfile,
      name: this.name,
      background: this.background,
      level: this.level,
      isAlive: this.isAlive,
      classes: this.classes,
      system: this.system,
    };
  }
}
