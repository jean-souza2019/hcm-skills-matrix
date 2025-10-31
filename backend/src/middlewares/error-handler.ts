import type { NextFunction, Request, Response } from 'express';

import { runtimeEnv } from '../config/env';
import { logError } from '../utils/logger';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (runtimeEnv.NODE_ENV !== 'test') {
    logError('Unhandled application error', error);
  }

  return res.status(500).json({
    message: 'Erro interno do servidor.',
  });
}
