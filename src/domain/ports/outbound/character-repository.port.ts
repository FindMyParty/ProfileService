import type { Character } from '../../entities/character.js';

export interface ICharacterRepository {
  save(character: Character): Promise<Character>;
  findById(id: string): Promise<Character | null>;
  findByProfileId(idProfile: string): Promise<Character[]>;
}
