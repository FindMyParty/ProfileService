import type { Profile, CreateProfileData, UpdateProfileData } from '../../entities/profile.js';

export interface IProfileUseCase {
  createProfile(data: CreateProfileData): Promise<Profile>;
  getProfileById(id: string): Promise<Profile>;
  updateProfile(id: string, data: UpdateProfileData): Promise<Profile>;
  resyncProfiles(): Promise<number>;
}
