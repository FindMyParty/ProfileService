import type { IThemeUseCase } from '../../domain/ports/inbound/theme-use-case.port.js';

export class ThemeService {
  #themeUseCase: IThemeUseCase;

  constructor({ themeUseCase }: { themeUseCase: IThemeUseCase }) {
    this.#themeUseCase = themeUseCase;
  }

  async createTheme(data: unknown) {
    const theme = await this.#themeUseCase.createTheme(data);
    return theme.toJSON();
  }

  async getThemeById(id: string) {
    const theme = await this.#themeUseCase.getThemeById(id);
    return theme.toJSON();
  }

  async listThemes() {
    const themes = await this.#themeUseCase.listThemes();
    return themes.map((t) => t.toJSON());
  }
}
