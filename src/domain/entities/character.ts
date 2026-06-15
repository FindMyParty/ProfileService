import { z } from 'zod';

const characterSchema = z.object({
  id: z.string().uuid(),
  idProfile: z.string().uuid(),
  name: z.string().min(1).max(255),
  background: z.string().max(500).nullable().optional(),
  level: z.number().int().min(1).max(20).default(1),
  isAlive: z.boolean().default(true),
});

const createCharacterSchema = characterSchema.omit({ id: true });

export type CharacterData = z.infer<typeof characterSchema>;
export type CreateCharacterData = z.input<typeof createCharacterSchema>;

export class Character {
  id: string;
  idProfile: string;
  name: string;
  background: string | null;
  level: number;
  isAlive: boolean;

  constructor(data: CharacterData) {
    this.id = data.id;
    this.idProfile = data.idProfile;
    this.name = data.name;
    this.background = data.background ?? null;
    this.level = data.level;
    this.isAlive = data.isAlive;
  }

  static create(data: unknown): Character {
    const parsed = createCharacterSchema.parse(data);
    return new Character({ ...parsed, id: crypto.randomUUID() });
  }

  static fromPersistence(row: {
    id: string;
    id_profile: string;
    name: string;
    background: string | null;
    level: number;
    is_alive: boolean;
  }): Character {
    return new Character({
      id: row.id,
      idProfile: row.id_profile,
      name: row.name,
      background: row.background,
      level: row.level,
      isAlive: row.is_alive,
    });
  }

  toJSON() {
    return {
      id: this.id,
      idProfile: this.idProfile,
      name: this.name,
      background: this.background,
      level: this.level,
      isAlive: this.isAlive,
    };
  }
}
