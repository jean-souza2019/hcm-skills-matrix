import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('User Role:', req.user?.role);
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    return next();
  };
}
