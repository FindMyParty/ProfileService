import type { RpgClass } from '../../entities/rpg-class.js';

export interface IRpgClassUseCase {
  createRpgClass(data: unknown): Promise<RpgClass>;
  getRpgClassById(id: string): Promise<RpgClass>;
  listRpgClasses(): Promise<RpgClass[]>;
}
