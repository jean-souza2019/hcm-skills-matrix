import type { NextFunction, Request, Response } from 'express';

import { runtimeEnv } from '../config/env';
import { logger } from '../lib/logger';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (runtimeEnv.NODE_ENV !== 'test') {
    logger.error('Unhandled application error', error);
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return res.status(500).json({
    message: 'Erro interno do servidor.',
  });
}
