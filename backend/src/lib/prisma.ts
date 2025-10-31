import { existsSync } from 'fs';
import path from 'path';

import { PrismaClient } from '@prisma/client';

import { runtimeEnv } from '../config/env';

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient };

const maybeBundledProcess = process as NodeJS.Process & { nexe?: boolean; pkg?: boolean };
const isBundled =
  Boolean(maybeBundledProcess.nexe) ||
  Boolean(maybeBundledProcess.pkg) ||
  process.env.BUNDLE_RUNTIME === 'sea';

if (isBundled || process.env.BUNDLE_EXECUTABLE_DIR) {
  const executableDir = process.env.BUNDLE_EXECUTABLE_DIR ?? path.dirname(process.execPath);
  const enginePath = path.join(
    executableDir,
    '.prisma',
    'client',
    'query_engine-windows.dll.node',
  );
  if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY && existsSync(enginePath)) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  }

  const schemaPath = path.join(executableDir, 'prisma', 'schema.prisma');
  if (!process.env.PRISMA_SCHEMA_PATH && existsSync(schemaPath)) {
    process.env.PRISMA_SCHEMA_PATH = schemaPath;
  }
}

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: runtimeEnv.isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

if (!runtimeEnv.isProduction) {
  globalForPrisma.prisma = prisma;
}
