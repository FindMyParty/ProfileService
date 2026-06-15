import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ThemeService } from '../../../../application/services/theme.service.js';
import { ValidationError } from '../../../../shared/errors.js';

const createThemeBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

const idParams = z.object({ id: z.string().uuid() });

const themeResponseSchema = {
  $id: 'Theme',
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

export default async function themeRoutes(
  fastify: FastifyInstance,
  options: { themeService: ThemeService },
): Promise<void> {
  const { themeService } = options;

  fastify.addSchema(themeResponseSchema);

  fastify.post(
    '/themes',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Criar tema',
        body: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
        response: {
          201: { type: 'object', properties: { data: { $ref: 'Theme#' } } },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = createThemeBody.safeParse(request.body);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await themeService.createTheme(result.data);
      return reply.status(201).send({ data });
    },
  );

  fastify.get(
    '/themes',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Listar temas',
        response: {
          200: { type: 'object', properties: { data: { type: 'array', items: { $ref: 'Theme#' } } } },
        },
      },
    },
    async (_request, reply) => {
      const data = await themeService.listThemes();
      return reply.status(200).send({ data });
    },
  );

  fastify.get(
    '/themes/:id',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Buscar tema por ID',
        params: uuidParam,
        response: {
          200: { type: 'object', properties: { data: { $ref: 'Theme#' } } },
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const result = idParams.safeParse(request.params);
      if (!result.success) throw new ValidationError(result.error.issues[0].message);
      const data = await themeService.getThemeById(result.data.id);
      return reply.status(200).send({ data });
    },
  );
}
