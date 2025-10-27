import { PrismaClient } from '@prisma/client';

import { runtimeEnv } from '../config/env';

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: runtimeEnv.isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

if (!runtimeEnv.isProduction) {
  globalForPrisma.prisma = prisma;
}
