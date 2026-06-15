import type { Theme } from '../../entities/theme.js';

export interface IThemeUseCase {
  createTheme(data: unknown): Promise<Theme>;
  getThemeById(id: string): Promise<Theme>;
  listThemes(): Promise<Theme[]>;
}
