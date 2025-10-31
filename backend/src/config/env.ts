import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

config();

const processWithPkg = process as NodeJS.Process & { pkg?: unknown };

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3333),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET nao pode ser vazio')
    .default('change-me'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  DATABASE_URL: z.string().default('file:./data/app.db'),
});

const resolveBasePath = () => {
  if (process.env.DATABASE_BASE_PATH) {
    return path.resolve(process.env.DATABASE_BASE_PATH);
  }

  if (processWithPkg.pkg) {
    return path.dirname(process.execPath);
  }

  return process.cwd();
};

const resolveDatabaseFile = (url: string): string => {
  let target = url.trim();

  if (target.startsWith('file:')) {
    target = target.slice(5);
  }

  if (path.isAbsolute(target)) {
    return target;
  }

  const basePath = resolveBasePath();
  const cleaned = target.replace(/^\.\/+/, '');
  const candidate = path.resolve(basePath, cleaned.length > 0 ? cleaned : target);

  if (fs.existsSync(candidate)) {

    return candidate;
  }

  const fallback = path.resolve(basePath, 'prisma', cleaned);

  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return candidate;
};

export type Env = z.infer<typeof envSchema> & {
  isProduction: boolean;
  databaseFile: string;
};

const parsed = envSchema.parse(process.env);

export const runtimeEnv: Env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === 'production',
  databaseFile: resolveDatabaseFile(parsed.DATABASE_URL),
};
