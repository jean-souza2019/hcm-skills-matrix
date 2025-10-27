import { Router } from 'express';
import { compare, hash } from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { runtimeEnv } from '../config/env';
import { prisma } from '../lib/prisma';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  '/login',
  validate(loginSchema),
  async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const validPassword = await compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const signOptions: SignOptions = {
      subject: user.id,
    };

    if (runtimeEnv.JWT_EXPIRES_IN) {
      signOptions.expiresIn = runtimeEnv.JWT_EXPIRES_IN as SignOptions['expiresIn'];
    }

    const token = jwt.sign(
      {
        role: user.role,
        email: user.email,
      },
      runtimeEnv.JWT_SECRET,
      signOptions,
    );

    return res.json({
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  },
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const matches = await compare(currentPassword, user.passwordHash);

    if (!matches) {
      return res.status(400).json({ message: 'Senha atual incorreta.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Utilize uma senha diferente da atual.' });
    }

    const passwordHash = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return res.status(204).send();
  },
);

export const authRoutes: Router = router;
