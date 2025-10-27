import type { NextFunction, Request, Response } from 'express';

import { runtimeEnv } from '../config/env';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (runtimeEnv.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return res.status(500).json({
    message: 'Erro interno do servidor.',
  });
}
