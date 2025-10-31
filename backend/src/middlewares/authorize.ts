import type { NextFunction, Request, Response } from 'express';

import type { Role } from '../domain/enums';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Nao autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    return next();
  };
}

