import type { ISystemUseCase } from '../../domain/ports/inbound/system-use-case.port.js';

export class SystemService {
  #systemUseCase: ISystemUseCase;

  constructor({ systemUseCase }: { systemUseCase: ISystemUseCase }) {
    this.#systemUseCase = systemUseCase;
  }

  async createSystem(data: unknown) {
    const system = await this.#systemUseCase.createSystem(data);
    return system.toJSON();
  }

  async getSystemById(id: string) {
    const system = await this.#systemUseCase.getSystemById(id);
    return system.toJSON();
  }

  async listSystems() {
    const systems = await this.#systemUseCase.listSystems();
    return systems.map((s) => s.toJSON());
  }
}
