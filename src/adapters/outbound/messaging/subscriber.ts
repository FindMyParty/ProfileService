import { logger } from '../../../shared/logger.js';

export async function registerSubscribers(
  _connection: unknown,
): Promise<void> {
  logger.info('Queue subscribers registered');
}
