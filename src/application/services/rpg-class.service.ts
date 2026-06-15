import type { IRpgClassUseCase } from '../../domain/ports/inbound/rpg-class-use-case.port.js';

export class RpgClassService {
  #rpgClassUseCase: IRpgClassUseCase;

  constructor({ rpgClassUseCase }: { rpgClassUseCase: IRpgClassUseCase }) {
    this.#rpgClassUseCase = rpgClassUseCase;
  }

  async createRpgClass(data: unknown) {
    const rpgClass = await this.#rpgClassUseCase.createRpgClass(data);
    return rpgClass.toJSON();
  }

  async getRpgClassById(id: string) {
    const rpgClass = await this.#rpgClassUseCase.getRpgClassById(id);
    return rpgClass.toJSON();
  }

  async listRpgClasses() {
    const classes = await this.#rpgClassUseCase.listRpgClasses();
    return classes.map((c) => c.toJSON());
  }
}
