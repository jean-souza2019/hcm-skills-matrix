import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

config();

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

const resolveDatabaseFile = (url: string): string => {
  let target = url.trim();

  if (target.startsWith('file:')) {
    target = target.slice(5);
  }

  if (path.isAbsolute(target)) {
    return target;
  }

  const cleaned = target.replace(/^\.\/+/, '');
  const candidate = path.resolve(process.cwd(), cleaned.length > 0 ? cleaned : target);

  if (fs.existsSync(candidate)) {
    return candidate;
  }

  const fallback = path.resolve(process.cwd(), 'prisma', cleaned);

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
