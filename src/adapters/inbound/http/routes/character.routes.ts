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
});

const idParams = z.object({ id: z.string().uuid() });
const profileIdParams = z.object({ id: z.string().uuid() });

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
          required: ['idProfile', 'name'],
          properties: {
            idProfile: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            background: { type: 'string', maxLength: 500 },
            level: { type: 'integer', minimum: 1, maximum: 20 },
            isAlive: { type: 'boolean' },
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
