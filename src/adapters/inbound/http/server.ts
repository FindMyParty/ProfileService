import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AppError } from '../../../shared/errors.js';
import { loggerConfig } from '../../../shared/logger.js';
import healthRoutes from './routes/health.js';
import profileRoutes from './routes/profile.routes.js';
import themeRoutes from './routes/theme.routes.js';
import rpgClassRoutes from './routes/rpg-class.routes.js';
import systemRoutes from './routes/system.routes.js';
import characterRoutes from './routes/character.routes.js';
import type { ProfileService } from '../../../application/services/profile.service.js';
import type { ThemeService } from '../../../application/services/theme.service.js';
import type { RpgClassService } from '../../../application/services/rpg-class.service.js';
import type { SystemService } from '../../../application/services/system.service.js';
import type { CharacterService } from '../../../application/services/character.service.js';

const errorSchema = {
  $id: 'Error',
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export async function buildServer(options: {
  profileService: ProfileService;
  themeService: ThemeService;
  rpgClassService: RpgClassService;
  systemService: SystemService;
  characterService: CharacterService;
  dependencyCheckers?: Record<string, () => Promise<string>>;
}) {
  const fastify = Fastify({ logger: loggerConfig });

  await fastify.register(cors);
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Profile Service',
        description: 'Serviço de perfis de usuários — plataforma FindMyParty',
        version: '1.0.0',
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  fastify.addSchema(errorSchema);

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    const fastifyError = error as Error & { validation?: unknown };
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: fastifyError.message },
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
    });
  });

  await fastify.register(healthRoutes, {
    dependencyCheckers: options.dependencyCheckers ?? {},
  });

  await fastify.register(profileRoutes, {
    profileService: options.profileService,
  });

  await fastify.register(themeRoutes, {
    themeService: options.themeService,
  });

  await fastify.register(rpgClassRoutes, {
    rpgClassService: options.rpgClassService,
  });

  await fastify.register(systemRoutes, {
    systemService: options.systemService,
  });

  await fastify.register(characterRoutes, {
    characterService: options.characterService,
  });

  return fastify;
}
