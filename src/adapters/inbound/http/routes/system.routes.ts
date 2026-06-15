import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { SystemService } from '../../../../application/services/system.service.js';
import { ValidationError } from '../../../../shared/errors.js';

const createSystemBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

const idParams = z.object({ id: z.string().uuid() });

const systemResponseSchema = {
  $id: 'System',
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

export default async function systemRoutes(
  fastify: FastifyInstance,
  options: { systemService: SystemService },
): Promise<void> {
  const { systemService } = options;

  fastify.addSchema(systemResponseSchema);

  fastify.post(
    '/systems',
    {
      schema: {
        tags: ['Systems'],
        summary: 'Criar sistema',
        body: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
        response: {
          201: { type: 'object', properties: { data: { $ref: 'System#' } } },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = createSystemBody.safeParse(request.body);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await systemService.createSystem(result.data);
      return reply.status(201).send({ data });
    },
  );

  fastify.get(
    '/systems',
    {
      schema: {
        tags: ['Systems'],
        summary: 'Listar sistemas',
        response: {
          200: { type: 'object', properties: { data: { type: 'array', items: { $ref: 'System#' } } } },
        },
      },
    },
    async (_request, reply) => {
      const data = await systemService.listSystems();
      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/systems/:id',
    {
      schema: {
        tags: ['Systems'],
        summary: 'Buscar sistema por ID',
        params: uuidParam,
        response: {
          200: { type: 'object', properties: { data: { $ref: 'System#' } } },
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = idParams.safeParse(request.params);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await systemService.getSystemById(result.data.id);
      return reply.status(200).send({ data });
    },
  );
}
