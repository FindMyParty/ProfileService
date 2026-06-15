import { System } from '../entities/system.js';
import type { ISystemRepository } from '../ports/outbound/system-repository.port.js';
import type { ISystemUseCase } from '../ports/inbound/system-use-case.port.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

export class SystemUseCase implements ISystemUseCase {
  #systemRepository: ISystemRepository;

  constructor({ systemRepository }: { systemRepository: ISystemRepository }) {
    this.#systemRepository = systemRepository;
  }

  async createSystem(data: unknown): Promise<System> {
    try {
      const system = System.create(data);
      return await this.#systemRepository.save(system);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new ConflictError('System already exists');
      throw error;
    }
  }

  async getSystemById(id: string): Promise<System> {
    const system = await this.#systemRepository.findById(id);
    if (!system) throw new NotFoundError('System');
    return system;
  }

  async listSystems(): Promise<System[]> {
    return this.#systemRepository.findAll();
  }
}
