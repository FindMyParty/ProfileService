// 1. Initialize OpenTelemetry SDK (must be first — patches modules at startup)
import { initTelemetry, shutdownTelemetry } from './config/observability/telemetry.js';
import { initSentry } from './config/observability/sentry.js';

// 2. Validate env vars (env is validated on import)
import { env } from './config/env.js';

initTelemetry({
  otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  serviceName: 'profile-service',
});

initSentry({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
});

import { logger } from './shared/logger.js';
import { buildServer } from './adapters/inbound/http/server.js';
import { checkPostgres, closeDatabase } from './adapters/outbound/db/client.js';
import { runMigrations } from './adapters/outbound/db/migrator.js';
import { PostgresProfileRepository } from './adapters/outbound/db/postgres-profile.repository.js';
import { PostgresThemeRepository } from './adapters/outbound/db/postgres-theme.repository.js';
import { PostgresRpgClassRepository } from './adapters/outbound/db/postgres-rpg-class.repository.js';
import { PostgresSystemRepository } from './adapters/outbound/db/postgres-system.repository.js';
import { PostgresCharacterRepository } from './adapters/outbound/db/postgres-character.repository.js';
import { createAmqpPublisher } from './adapters/outbound/messaging/publisher.js';
import { registerSubscribers } from './adapters/outbound/messaging/subscriber.js';
import { ProfileUseCase } from './domain/use-cases/profile.use-case.js';
import { ThemeUseCase } from './domain/use-cases/theme.use-case.js';
import { RpgClassUseCase } from './domain/use-cases/rpg-class.use-case.js';
import { SystemUseCase } from './domain/use-cases/system.use-case.js';
import { CharacterUseCase } from './domain/use-cases/character.use-case.js';
import { ProfileService } from './application/services/profile.service.js';
import { ThemeService } from './application/services/theme.service.js';
import { RpgClassService } from './application/services/rpg-class.service.js';
import { SystemService } from './application/services/system.service.js';
import { CharacterService } from './application/services/character.service.js';

async function main() {
  // 3. Connect database and run pending migrations
  await checkPostgres();
  await runMigrations();
  const profileRepository = new PostgresProfileRepository();
  logger.info('Database connected (PostgreSQL)');

  // 4. Connect RabbitMQ
  const { publisher, connection, checkRabbitMQ, close: closePublisher } =
    await createAmqpPublisher();
  logger.info('RabbitMQ connected');

  // 5. Register queue subscribers
  await registerSubscribers(connection);

  // Wire dependencies
  const profileUseCase = new ProfileUseCase({
    profileRepository,
    eventPublisher: publisher,
    profileEventRoutingKey: env.PROFILE_EVENT_ROUTING_KEY,
  });
  const profileService = new ProfileService({ profileUseCase });

  const themeRepository = new PostgresThemeRepository();
  const themeUseCase = new ThemeUseCase({ themeRepository });
  const themeService = new ThemeService({ themeUseCase });

  const rpgClassRepository = new PostgresRpgClassRepository();
  const rpgClassUseCase = new RpgClassUseCase({ rpgClassRepository });
  const rpgClassService = new RpgClassService({ rpgClassUseCase });

  const systemRepository = new PostgresSystemRepository();
  const systemUseCase = new SystemUseCase({ systemRepository });
  const systemService = new SystemService({ systemUseCase });

  const characterRepository = new PostgresCharacterRepository();
  const characterUseCase = new CharacterUseCase({ characterRepository });
  const characterService = new CharacterService({ characterUseCase });

  // 6. Start HTTP server
  const server = await buildServer({
    profileService,
    themeService,
    rpgClassService,
    systemService,
    characterService,
    dependencyCheckers: {
      postgres: checkPostgres,
      rabbitmq: checkRabbitMQ,
    },
  });

  await server.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`Server listening on port ${env.PORT}`);

  // 7. Handle SIGTERM and SIGINT — graceful shutdown
  async function shutdown(signal: string) {
    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

    try {
      await server.close();
      logger.info('HTTP server closed');
    } catch (error) {
      logger.error(error, 'Error closing HTTP server');
    }

    try {
      await closePublisher();
      logger.info('RabbitMQ closed');
    } catch (error) {
      logger.error(error, 'Error closing RabbitMQ');
    }

    try {
      await closeDatabase();
      logger.info('Database closed');
    } catch (error) {
      logger.error(error, 'Error closing database');
    }

    try {
      await shutdownTelemetry();
      logger.info('Telemetry shut down');
    } catch (error) {
      logger.error(error, 'Error shutting down telemetry');
    }

    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error(error, 'Failed to start service');
  process.exit(1);
});
