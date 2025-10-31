import path from 'node:path';
import type { Prisma, PrismaClient as PrismaClientInstanceType } from '@prisma/client';

import { runtimeEnv } from '../config/env';
import { logger, logUnhandledError } from './logger';

type NodeProcessWithPkg = NodeJS.Process & { pkg?: unknown };
type PrismaModule = typeof import('@prisma/client');
type PrismaClientConstructor = PrismaModule['PrismaClient'];
type PrismaClientInstance = PrismaClientInstanceType;
type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClientInstance;
};

const processWithPkg = process as NodeProcessWithPkg;
const globalForPrisma = globalThis as GlobalWithPrisma;
let PrismaClient: PrismaClientConstructor;

try {
  const prismaModule = requirePrismaModule();
  PrismaClient = prismaModule.PrismaClient;
} catch (error) {
  logUnhandledError('prisma-client-module-load', error);
  throw error;
}

if (processWithPkg.pkg) {
  const executableDir = path.dirname(process.execPath);
  const prismaDir = path.join(executableDir, 'prisma');

  process.env.PRISMA_QUERY_ENGINE_LIBRARY ||= path.join(
    prismaDir,
    'query_engine-windows.dll.node',
  );
  process.env.PRISMA_QUERY_ENGINE_BINARY ||= process.env.PRISMA_QUERY_ENGINE_LIBRARY;
  process.env.PRISMA_SCHEMA_PATH ||= path.join(prismaDir, 'schema.prisma');
}

const prismaLogConfig: (Prisma.LogLevel | Prisma.LogDefinition)[] = runtimeEnv.isProduction
  ? [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ]
  : [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
  ];

type EventfulPrismaClient = PrismaClientInstanceType<
  Prisma.PrismaClientOptions,
  'query' | 'info' | 'warn' | 'error'
>;

const prismaInstance =
  globalForPrisma.prisma ??
  (new PrismaClient({ log: prismaLogConfig }) as PrismaClientInstance);

if (!globalForPrisma.prisma) {
  registerLogForwarders(prismaInstance);
}

if (!runtimeEnv.isProduction) {
  globalForPrisma.prisma ??= prismaInstance;
}

export const prisma = prismaInstance;

function registerLogForwarders(client: InstanceType<PrismaClientConstructor>) {
  const eventfulClient = client as unknown as EventfulPrismaClient;

  eventfulClient.$on('error', (event: Prisma.LogEvent) => {
    logger.error('Prisma error', {
      message: event.message,
      target: event.target,
    });
  });

  eventfulClient.$on('warn', (event: Prisma.LogEvent) => {
    logger.warn('Prisma warning', {
      message: event.message,
      target: event.target,
    });
  });

  eventfulClient.$on('info', (event: Prisma.LogEvent) => {
    logger.info('Prisma info', {
      message: event.message,
      target: event.target,
    });
  });

  eventfulClient.$on('query', (event: Prisma.QueryEvent) => {
    logger.debug('Prisma query', {
      query: event.query,
      params: event.params,
      durationMs: event.duration,
      target: event.target,
    });
  });
}

function requirePrismaModule(): PrismaModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require('@prisma/client') as PrismaModule;
}
