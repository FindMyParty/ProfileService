import { z } from 'zod';

const themeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export type ThemeData = z.infer<typeof themeSchema>;

export class Theme {
  id: string;
  name: string;

  constructor(data: ThemeData) {
    this.id = data.id;
    this.name = data.name;
  }

  static create(data: unknown): Theme {
    const parsed = themeSchema.parse(data);
    return new Theme(parsed);
  }

  static fromPersistence(row: { id: string; name: string }): Theme {
    return new Theme({ id: row.id, name: row.name });
  }

  toJSON() {
    return { id: this.id, name: this.name };
  }
}
