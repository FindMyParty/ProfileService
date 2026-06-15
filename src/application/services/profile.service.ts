import type { IProfileUseCase } from '../../domain/ports/inbound/profile-use-case.port.js';
import type { CreateProfileData, UpdateProfileData } from '../../domain/entities/profile.js';

export class ProfileService {
  #profileUseCase: IProfileUseCase;

  constructor({ profileUseCase }: { profileUseCase: IProfileUseCase }) {
    this.#profileUseCase = profileUseCase;
  }

  async createProfile(data: CreateProfileData) {
    const profile = await this.#profileUseCase.createProfile(data);
    return profile.toJSON();
  }

  async getProfileById(id: string) {
    const profile = await this.#profileUseCase.getProfileById(id);
    return profile.toJSON();
  }

  async updateProfile(id: string, data: UpdateProfileData) {
    const profile = await this.#profileUseCase.updateProfile(id, data);
    return profile.toJSON();
  }
}
