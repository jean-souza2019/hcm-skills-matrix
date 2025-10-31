import { initializeLogger, logError, logInfo } from './utils/logger';

initializeLogger();

async function bootstrap() {
  try {
    logInfo('Starting backend application');

    const [{ runtimeEnv }, { createApp }, databaseModule] = await Promise.all([
      import('./config/env'),
      import('./app'),
      import('./lib/database'),
    ]);

    await databaseModule.initializeDatabase();

    if (databaseModule.wasDatabaseCreatedOnInit()) {
      logInfo('Database file not found. Running initial seed...');
      const { seedDefaultData } = await import('./seed');
      const result = await seedDefaultData();
      logInfo(
        `Seed completed with admin ${result.adminEmail}. Default password: ${result.adminPassword}`,
      );
    }

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
