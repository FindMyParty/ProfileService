import type { Theme } from '../../entities/theme.js';

export interface IThemeRepository {
  save(theme: Theme): Promise<Theme>;
  findById(id: string): Promise<Theme | null>;
  findAll(): Promise<Theme[]>;
}
