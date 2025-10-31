import { createApp } from './app';
import { runtimeEnv } from './config/env';
import { logger, logDestination, logUnhandledError } from './lib/logger';

const port = runtimeEnv.PORT;

process.on('uncaughtException', (error) => {
  logUnhandledError('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  logUnhandledError('unhandledRejection', reason);
});

process.on('warning', (warning) => {
  logger.warn('Process warning emitted', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

process.on('exit', (code) => {
  logger.info('Process exiting', { code });
});

bootstrap().catch((error) => {
  logUnhandledError('bootstrap', error);
  process.exit(1);
});

async function bootstrap() {
  logger.info('Bootstrapping application', {
    pid: process.pid,
    port,
    nodeVersion: process.version,
    logDestination,
  });

  const app = createApp();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${port}`);
    logger.info(`Server running on http://localhost:${port}`);
  });
}
