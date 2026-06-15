import { RpgClass } from '../entities/rpg-class.js';
import type { IRpgClassRepository } from '../ports/outbound/rpg-class-repository.port.js';
import type { IRpgClassUseCase } from '../ports/inbound/rpg-class-use-case.port.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

export class RpgClassUseCase implements IRpgClassUseCase {
  #rpgClassRepository: IRpgClassRepository;

  constructor({ rpgClassRepository }: { rpgClassRepository: IRpgClassRepository }) {
    this.#rpgClassRepository = rpgClassRepository;
  }

  async createRpgClass(data: unknown): Promise<RpgClass> {
    try {
      const rpgClass = RpgClass.create(data);
      return await this.#rpgClassRepository.save(rpgClass);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new ConflictError('Class already exists');
      throw error;
    }
  }

  async getRpgClassById(id: string): Promise<RpgClass> {
    const rpgClass = await this.#rpgClassRepository.findById(id);
    if (!rpgClass) throw new NotFoundError('Class');
    return rpgClass;
  }

  async listRpgClasses(): Promise<RpgClass[]> {
    return this.#rpgClassRepository.findAll();
  }
}
