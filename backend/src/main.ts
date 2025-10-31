import { initializeLogger, logError, logInfo } from './utils/logger';

initializeLogger();

async function bootstrap() {
  try {
    logInfo('Starting backend application');

    const [{ runtimeEnv }, { createApp }] = await Promise.all([
      import('./config/env'),
      import('./app'),
    ]);

    const app = createApp();
    const port = runtimeEnv.PORT;

    const server = app.listen(port, () => {
      logInfo(`Server running on http://localhost:${port}`);
    });

    server.on('error', (error) => {
      logError('HTTP server emitted an error', error);
    });
  } catch (error) {
    logError('Failed to bootstrap application', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logError('Unexpected error outside bootstrap', error);
  process.exit(1);
});
