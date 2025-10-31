import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { assessmentsRoutes } from './routes/assessments.routes';
import { authRoutes } from './routes/auth.routes';
import { collaboratorsRoutes } from './routes/collaborators.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { modulesRoutes } from './routes/modules.routes';
import { reportsRoutes } from './routes/reports.routes';
import { skillsRoutes } from './routes/skills.routes';
import { usersRoutes } from './routes/users.routes';
import { errorHandler } from './middlewares/error-handler';
import { httpLogStream } from './lib/logger';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use(morgan('combined', { stream: httpLogStream }));

  app.get('/healths', (_req, res) => res.json({ status: 'ok' }));

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/collaborators', collaboratorsRoutes);
  app.use('/modules', modulesRoutes);
  app.use('/skills', skillsRoutes);
  app.use('/assessments', assessmentsRoutes);
  app.use('/reports', reportsRoutes);
  app.use('/dashboard', dashboardRoutes);

  app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

  app.use(errorHandler);

  return app;
}
