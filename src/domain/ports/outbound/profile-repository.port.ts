import type { Profile, UpdateProfileData } from '../../entities/profile.js';

export interface IProfileRepository {
  save(profile: Profile): Promise<Profile>;
  findById(id: string): Promise<Profile | null>;
  update(profile: Profile): Promise<Profile>;
}
