import type { ICharacterUseCase } from '../../domain/ports/inbound/character-use-case.port.js';
import type { CreateCharacterData, UpdateCharacterData } from '../../domain/entities/character.js';

export class CharacterService {
  #characterUseCase: ICharacterUseCase;

  constructor({ characterUseCase }: { characterUseCase: ICharacterUseCase }) {
    this.#characterUseCase = characterUseCase;
  }

  async createCharacter(data: CreateCharacterData) {
    const character = await this.#characterUseCase.createCharacter(data);
    return character.toJSON();
  }

  async getCharacterById(id: string) {
    const character = await this.#characterUseCase.getCharacterById(id);
    return character.toJSON();
  }

  async listCharactersByProfile(idProfile: string) {
    const characters = await this.#characterUseCase.listCharactersByProfile(idProfile);
    return characters.map((c) => c.toJSON());
  }

  async updateCharacter(id: string, data: UpdateCharacterData) {
    const character = await this.#characterUseCase.updateCharacter(id, data);
    return character.toJSON();
  }
}
