import { config } from 'dotenv';
import { z } from 'zod';

config();

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
