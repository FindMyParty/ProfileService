import type { System } from '../../entities/system.js';

export interface ISystemUseCase {
  createSystem(data: unknown): Promise<System>;
  getSystemById(id: string): Promise<System>;
  listSystems(): Promise<System[]>;
}
