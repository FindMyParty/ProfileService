import { Character, type CreateCharacterData, type UpdateCharacterData } from '../entities/character.js';
import type { ICharacterRepository } from '../ports/outbound/character-repository.port.js';
import type { ICharacterUseCase } from '../ports/inbound/character-use-case.port.js';
import { NotFoundError } from '../../shared/errors.js';

export class CharacterUseCase implements ICharacterUseCase {
  #characterRepository: ICharacterRepository;

  constructor({ characterRepository }: { characterRepository: ICharacterRepository }) {
    this.#characterRepository = characterRepository;
  }

  async createCharacter(data: CreateCharacterData): Promise<Character> {
    const character = Character.create(data);
    return this.#characterRepository.save(character);
  }

  async getCharacterById(id: string): Promise<Character> {
    const character = await this.#characterRepository.findById(id);
    if (!character) throw new NotFoundError('Character');
    return character;
  }

  async listCharactersByProfile(idProfile: string): Promise<Character[]> {
    return this.#characterRepository.findByProfileId(idProfile);
  }

  async updateCharacter(id: string, data: UpdateCharacterData): Promise<Character> {
    const character = await this.#characterRepository.findById(id);
    if (!character) throw new NotFoundError('Character');
    character.update(data);
    return this.#characterRepository.update(character);
  }
}
