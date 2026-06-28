import { Profile, type CreateProfileData, type UpdateProfileData } from '../entities/profile.js';
import type { IProfileRepository } from '../ports/outbound/profile-repository.port.js';
import type { IEventPublisher } from '../ports/outbound/event-publisher.port.js';
import type { IProfileUseCase } from '../ports/inbound/profile-use-case.port.js';
import { NotFoundError } from '../../shared/errors.js';

export class ProfileUseCase implements IProfileUseCase {
  #profileRepository: IProfileRepository;
  #eventPublisher: IEventPublisher;
  #profileEventRoutingKey: string;

  constructor({
    profileRepository,
    eventPublisher,
    profileEventRoutingKey,
  }: {
    profileRepository: IProfileRepository;
    eventPublisher: IEventPublisher;
    profileEventRoutingKey: string;
  }) {
    this.#profileRepository = profileRepository;
    this.#eventPublisher = eventPublisher;
    this.#profileEventRoutingKey = profileEventRoutingKey;
  }

  async #getProfileOrThrow(id: string): Promise<Profile> {
    const profile = await this.#profileRepository.findById(id);
    if (!profile) throw new NotFoundError('Profile');
    return profile;
  }

  async createProfile(data: CreateProfileData): Promise<Profile> {
    const profile = Profile.create(data);
    const saved = await this.#profileRepository.save(profile);
    await this.#eventPublisher.publish(this.#profileEventRoutingKey, saved.toJSON());
    return saved;
  }

  async getProfileById(id: string): Promise<Profile> {
    return this.#getProfileOrThrow(id);
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<Profile> {
    const profile = await this.#getProfileOrThrow(id);
    profile.update(data);
    const updated = await this.#profileRepository.update(profile);
    await this.#eventPublisher.publish(this.#profileEventRoutingKey, updated.toJSON());
    return updated;
  }

  async resyncProfiles(): Promise<number> {
    const profiles = await this.#profileRepository.findAll();
    await Promise.all(
      profiles.map((p) => this.#eventPublisher.publish(this.#profileEventRoutingKey, p.toJSON())),
    );
    return profiles.length;
  }
}
