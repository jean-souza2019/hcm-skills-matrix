import fs from 'node:fs';
import path from 'node:path';

import { config } from 'dotenv';
import { z } from 'zod';

type NodeProcessWithPkg = NodeJS.Process & { pkg?: unknown };

const processWithPkg = process as NodeProcessWithPkg;
const executableDir = processWithPkg.pkg
  ? path.dirname(process.execPath)
  : undefined;

config();
hydrateFromAdditionalEnvLocations();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3333),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET não pode ser vazio')
    .default('change-me'),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

export type Env = z.infer<typeof envSchema> & { isProduction: boolean };

const parsed = envSchema.parse(process.env);

export const runtimeEnv: Env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === 'production',
};

function hydrateFromAdditionalEnvLocations() {
  const candidates = new Set<string>();
  const configured = process.env.HCM_ENV_FILE ?? process.env.DOTENV_PATH;

  if (configured) {
    candidates.add(path.resolve(configured));
  }

  candidates.add(path.resolve(process.cwd(), '.env'));

  if (executableDir) {
    candidates.add(path.join(executableDir, '.env'));
  }

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    config({ path: candidate, override: false });
  }
}
