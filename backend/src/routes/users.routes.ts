import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate';
import { findUserSummaryById } from '../repositories/users.repository';

const router = Router();

router.get('/me', authenticate, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Nao autenticado.' });
  }

  const user = await findUserSummaryById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'Usuario nao encontrado.' });
  }

  return res.json(user);
});

export const usersRoutes: Router = router;
