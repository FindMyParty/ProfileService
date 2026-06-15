import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry({
  dsn,
  environment = 'development',
}: {
  dsn?: string;
  environment?: string;
}) {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 1.0,
  });

  initialized = true;
}

export function isSentryInitialized(): boolean {
  return initialized;
}
