import { Theme } from '../entities/theme.js';
import type { IThemeRepository } from '../ports/outbound/theme-repository.port.js';
import type { IThemeUseCase } from '../ports/inbound/theme-use-case.port.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

export class ThemeUseCase implements IThemeUseCase {
  #themeRepository: IThemeRepository;

  constructor({ themeRepository }: { themeRepository: IThemeRepository }) {
    this.#themeRepository = themeRepository;
  }

  async createTheme(data: unknown): Promise<Theme> {
    try {
      const theme = Theme.create(data);
      return await this.#themeRepository.save(theme);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new ConflictError('Theme already exists');
      throw error;
    }
  }

  async getThemeById(id: string): Promise<Theme> {
    const theme = await this.#themeRepository.findById(id);
    if (!theme) throw new NotFoundError('Theme');
    return theme;
  }

  async listThemes(): Promise<Theme[]> {
    return this.#themeRepository.findAll();
  }
}
