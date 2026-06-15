import { z } from 'zod';

const rpgClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

const createRpgClassSchema = rpgClassSchema.omit({ id: true });

export type RpgClassData = z.infer<typeof rpgClassSchema>;

export class RpgClass {
  id: string;
  name: string;

  constructor(data: RpgClassData) {
    this.id = data.id;
    this.name = data.name;
  }

  static create(data: unknown): RpgClass {
    const parsed = createRpgClassSchema.parse(data);
    return new RpgClass({ ...parsed, id: crypto.randomUUID() });
  }

  static fromPersistence(row: { id: string; name: string }): RpgClass {
    return new RpgClass({ id: row.id, name: row.name });
  }

  toJSON() {
    return { id: this.id, name: this.name };
  }
}
