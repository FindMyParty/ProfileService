import { Profile, type CreateProfileData, type UpdateProfileData } from '../entities/profile.js';
import type { IProfileRepository } from '../ports/outbound/profile-repository.port.js';
import type { IEventPublisher } from '../ports/outbound/event-publisher.port.js';
import type { IProfileUseCase } from '../ports/inbound/profile-use-case.port.js';
import { NotFoundError } from '../../shared/errors.js';

const EVENTS = Object.freeze({
  CREATED: 'profile.profile.created',
  UPDATED: 'profile.profile.updated',
});

export class ProfileUseCase implements IProfileUseCase {
  #profileRepository: IProfileRepository;
  #eventPublisher: IEventPublisher;

  constructor({
    profileRepository,
    eventPublisher,
  }: {
    profileRepository: IProfileRepository;
    eventPublisher: IEventPublisher;
  }) {
    this.#profileRepository = profileRepository;
    this.#eventPublisher = eventPublisher;
  }

  async #getProfileOrThrow(id: string): Promise<Profile> {
    const profile = await this.#profileRepository.findById(id);
    if (!profile) throw new NotFoundError('Profile');
    return profile;
  }

  async createProfile(data: CreateProfileData): Promise<Profile> {
    const profile = Profile.create(data);
    const saved = await this.#profileRepository.save(profile);
    await this.#eventPublisher.publish(EVENTS.CREATED, saved.toJSON());
    return saved;
  }

  async getProfileById(id: string): Promise<Profile> {
    return this.#getProfileOrThrow(id);
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<Profile> {
    const profile = await this.#getProfileOrThrow(id);
    profile.update(data);
    const updated = await this.#profileRepository.update(profile);
    await this.#eventPublisher.publish(EVENTS.UPDATED, updated.toJSON());
    return updated;
  }
}
