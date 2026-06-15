import type { System } from '../../entities/system.js';

export interface ISystemRepository {
  save(system: System): Promise<System>;
  findById(id: string): Promise<System | null>;
  findAll(): Promise<System[]>;
}
