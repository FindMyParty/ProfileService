import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ProfileService } from '../../../../application/services/profile.service.js';
import { ValidationError, ConflictError } from '../../../../shared/errors.js';

const experienceEnum = ['beginner', 'intermediate', 'veteran'] as const;

const createProfileBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthday: z.string().date().optional(),
  description: z.string().max(1000).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDM: z.boolean().optional(),
  isPlayer: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  experience: z.enum(experienceEnum).optional(),
});

const updateProfileBody = z.object({
  name: z.string().min(1).max(255).optional(),
  birthday: z.string().date().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isDM: z.boolean().optional(),
  isPlayer: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  experience: z.enum(experienceEnum).optional(),
});

const idParams = z.object({
  id: z.string().uuid(),
});

const profileResponseSchema = {
  $id: 'Profile',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    birthday: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    latitude: { type: 'number', nullable: true },
    longitude: { type: 'number', nullable: true },
    lastLogin: { type: 'string', format: 'date-time', nullable: true },
    isDM: { type: 'boolean' },
    isPlayer: { type: 'boolean' },
    isActive: { type: 'boolean' },
    isRemote: { type: 'boolean' },
    experience: { type: 'string', enum: experienceEnum },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const errorResponse = { $ref: 'Error#' };
const uuidParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

export default async function profileRoutes(
  fastify: FastifyInstance,
  options: { profileService: ProfileService },
): Promise<void> {
  const { profileService } = options;

  fastify.addSchema(profileResponseSchema);

  fastify.post(
    '/profiles',
    {
      schema: {
        tags: ['Profiles'],
        summary: 'Criar perfil',
        body: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'UUID do usuário autenticado' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            birthday: { type: 'string', format: 'date' },
            description: { type: 'string', maxLength: 1000 },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            isDM: { type: 'boolean' },
            isPlayer: { type: 'boolean' },
            isRemote: { type: 'boolean' },
            experience: { type: 'string', enum: experienceEnum },
          },
        },
        response: {
          201: { type: 'object', properties: { data: { $ref: 'Profile#' } } },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = createProfileBody.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0].message);
      }

      const { birthday, ...rest } = result.data;
      const data = await profileService.createProfile({
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined,
      });

      return reply.status(201).send({ data });
    },
  );

  fastify.put(
    '/profiles/:id',
    {
      schema: {
        tags: ['Profiles'],
        summary: 'Atualizar perfil',
        params: uuidParam,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            birthday: { type: 'string', format: 'date', nullable: true },
            description: { type: 'string', maxLength: 1000, nullable: true },
            latitude: { type: 'number', nullable: true },
            longitude: { type: 'number', nullable: true },
            isDM: { type: 'boolean' },
            isPlayer: { type: 'boolean' },
            isActive: { type: 'boolean' },
            isRemote: { type: 'boolean' },
            experience: { type: 'string', enum: experienceEnum },
          },
        },
        response: {
          200: { type: 'object', properties: { data: { $ref: 'Profile#' } } },
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const paramsResult = idParams.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ValidationError(paramsResult.error.issues[0].message);
      }

      const bodyResult = updateProfileBody.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ValidationError(bodyResult.error.issues[0].message);
      }

      const { birthday, ...rest } = bodyResult.data;
      const data = await profileService.updateProfile(paramsResult.data.id, {
        ...rest,
        birthday: birthday !== undefined
          ? (birthday !== null ? new Date(birthday) : null)
          : undefined,
      });

      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/profiles/:id',
    {
      schema: {
        tags: ['Profiles'],
        summary: 'Buscar perfil por ID',
        params: uuidParam,
        response: {
          200: { type: 'object', properties: { data: { $ref: 'Profile#' } } },
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = idParams.safeParse(request.params);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0].message);
      }

      const data = await profileService.getProfileById(result.data.id);
      return reply.status(200).send({ data });
    },
  );
}
