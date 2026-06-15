import type { RpgClass } from '../../entities/rpg-class.js';

export interface IRpgClassRepository {
  save(rpgClass: RpgClass): Promise<RpgClass>;
  findById(id: string): Promise<RpgClass | null>;
  findAll(): Promise<RpgClass[]>;
}
