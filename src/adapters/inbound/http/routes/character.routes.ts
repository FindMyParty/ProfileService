import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { CharacterService } from '../../../../application/services/character.service.js';
import { ValidationError } from '../../../../shared/errors.js';

const createCharacterBody = z.object({
  idProfile: z.string().uuid(),
  name: z.string().min(1).max(255),
  background: z.string().max(500).optional(),
  level: z.number().int().min(1).max(20).optional(),
  isAlive: z.boolean().optional(),
  classIds: z.array(z.string().uuid()).min(1),
  idSystem: z.string().uuid(),
});

const updateCharacterBody = z.object({
  name: z.string().min(1).max(255).optional(),
  background: z.string().max(500).optional().nullable(),
  level: z.number().int().min(1).max(20).optional(),
  isAlive: z.boolean().optional(),
  classIds: z.array(z.string().uuid()).min(1).optional(),
  idSystem: z.string().uuid().optional(),
});

const idParams = z.object({ id: z.string().uuid() });
const profileIdParams = z.object({ id: z.string().uuid() });

const associationSchema = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
  },
};

const characterResponseSchema = {
  $id: 'Character',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    idProfile: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    background: { type: 'string', nullable: true },
    level: { type: 'integer' },
    isAlive: { type: 'boolean' },
    classes: { type: 'array', items: associationSchema },
    system: associationSchema,
  },
};

const uuidParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

const errorResponse = { $ref: 'Error#' };

export default async function characterRoutes(
  fastify: FastifyInstance,
  options: { characterService: CharacterService },
): Promise<void> {
  const { characterService } = options;

  fastify.addSchema(characterResponseSchema);

  fastify.post(
    '/characters',
    {
      schema: {
        tags: ['Characters'],
        summary: 'Criar personagem',
        body: {
          type: 'object',
          required: ['idProfile', 'name', 'classIds', 'idSystem'],
          properties: {
            idProfile: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            background: { type: 'string', maxLength: 500 },
            level: { type: 'integer', minimum: 1, maximum: 20 },
            isAlive: { type: 'boolean' },
            classIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
            idSystem: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: { type: 'object', properties: { data: { $ref: 'Character#' } } },
          400: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = createCharacterBody.safeParse(request.body);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await characterService.createCharacter(result.data);
      return reply.status(201).send({ data });
    },
  );

  fastify.put(
    '/characters/:id',
    {
      schema: {
        tags: ['Characters'],
        summary: 'Atualizar personagem',
        params: uuidParam,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            background: { type: 'string', maxLength: 500, nullable: true },
            level: { type: 'integer', minimum: 1, maximum: 20 },
            isAlive: { type: 'boolean' },
            classIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
            idSystem: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: { type: 'object', properties: { data: { $ref: 'Character#' } } },
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const paramsResult = idParams.safeParse(request.params);
      if (!paramsResult.success) throw new ValidationError(paramsResult.error.issues[0].message);

      const bodyResult = updateCharacterBody.safeParse(request.body);
      if (!bodyResult.success) throw new ValidationError(bodyResult.error.issues[0].message);

      const data = await characterService.updateCharacter(paramsResult.data.id, bodyResult.data);
      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/characters/:id',
    {
      schema: {
        tags: ['Characters'],
        summary: 'Buscar personagem por ID',
        params: uuidParam,
        response: {
          200: { type: 'object', properties: { data: { $ref: 'Character#' } } },
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = idParams.safeParse(request.params);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await characterService.getCharacterById(result.data.id);
      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/profiles/:id/characters',
    {
      schema: {
        tags: ['Characters'],
        summary: 'Listar personagens de um perfil',
        params: uuidParam,
        response: {
          200: {
            type: 'object',
            properties: { data: { type: 'array', items: { $ref: 'Character#' } } },
          },
        },
      },
    },
    async (request, reply) => {
      const result = profileIdParams.safeParse(request.params);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await characterService.listCharactersByProfile(result.data.id);
      return reply.status(200).send({ data });
    },
  );
}
