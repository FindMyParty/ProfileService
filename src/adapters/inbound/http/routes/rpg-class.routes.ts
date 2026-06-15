import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { RpgClassService } from '../../../../application/services/rpg-class.service.js';
import { ValidationError } from '../../../../shared/errors.js';

const createRpgClassBody = z.object({
  name: z.string().min(1).max(255),
});

const idParams = z.object({ id: z.string().uuid() });

const rpgClassResponseSchema = {
  $id: 'RpgClass',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
  },
};

const uuidParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

const errorResponse = { $ref: 'Error#' };

export default async function rpgClassRoutes(
  fastify: FastifyInstance,
  options: { rpgClassService: RpgClassService },
): Promise<void> {
  const { rpgClassService } = options;

  fastify.addSchema(rpgClassResponseSchema);

  fastify.post(
    '/classes',
    {
      schema: {
        tags: ['Classes'],
        summary: 'Criar classe',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
        response: {
          201: { type: 'object', properties: { data: { $ref: 'RpgClass#' } } },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = createRpgClassBody.safeParse(request.body);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await rpgClassService.createRpgClass(result.data);
      return reply.status(201).send({ data });
    },
  );

  fastify.get(
    '/classes',
    {
      schema: {
        tags: ['Classes'],
        summary: 'Listar classes',
        response: {
          200: { type: 'object', properties: { data: { type: 'array', items: { $ref: 'RpgClass#' } } } },
        },
      },
    },
    async (_request, reply) => {
      const data = await rpgClassService.listRpgClasses();
      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/classes/:id',
    {
      schema: {
        tags: ['Classes'],
        summary: 'Buscar classe por ID',
        params: uuidParam,
        response: {
          200: { type: 'object', properties: { data: { $ref: 'RpgClass#' } } },
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = idParams.safeParse(request.params);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await rpgClassService.getRpgClassById(result.data.id);
      return reply.status(200).send({ data });
    },
  );
}
