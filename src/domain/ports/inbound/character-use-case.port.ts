import type { Character, CreateCharacterData } from '../../entities/character.js';

export interface ICharacterUseCase {
  createCharacter(data: CreateCharacterData): Promise<Character>;
  getCharacterById(id: string): Promise<Character>;
  listCharactersByProfile(idProfile: string): Promise<Character[]>;
}
