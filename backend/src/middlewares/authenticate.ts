import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { runtimeEnv } from '../config/env';
import { prisma } from '../lib/prisma';

interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação ausente.' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, runtimeEnv.JWT_SECRET) as TokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}
