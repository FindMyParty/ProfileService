import { z } from 'zod';

const systemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

const createSystemSchema = systemSchema.omit({ id: true });

export type SystemData = z.infer<typeof systemSchema>;

export class System {
  id: string;
  name: string;

  constructor(data: SystemData) {
    this.id = data.id;
    this.name = data.name;
  }

  static create(data: unknown): System {
    const parsed = createSystemSchema.parse(data);
    return new System({ ...parsed, id: crypto.randomUUID() });
  }

  static fromPersistence(row: { id: string; name: string }): System {
    return new System({ id: row.id, name: row.name });
  }

  toJSON() {
    return { id: this.id, name: this.name };
  }
}
