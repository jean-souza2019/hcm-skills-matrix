import { Router } from 'express';
import { z } from 'zod';

import { Role } from '../domain/enums';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createModule,
  deleteModule,
  findModuleById,
  listModules,
  updateModule,
} from '../repositories/modules.repository';

const router = Router();

const moduleSchema = z.object({
  code: z.string().min(2),
  description: z.string().min(3),
  observation: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  code: z.union([z.string(), z.array(z.string())]).optional(),
  description: z.string().optional(),
});

type CodeFilter = {
  exact: string[];
  partial?: string;
};

const normalizeCodeFilter = (
  value?: string | string[],
): CodeFilter | undefined => {
  if (!value) return undefined;

  const rawValues = Array.isArray(value) ? value : value.split(',');

  const cleaned = rawValues
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (cleaned.length === 0) return undefined;

  const normalized = cleaned.map((entry) => entry.toUpperCase());

  if (normalized.length === 1) {
    return {
      exact: normalized,
      partial: normalized[0],
    };
  }

  return {
    exact: normalized,
  };
};

router.post(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(moduleSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof moduleSchema>;

    const module = await createModule({
      code: payload.code,
      description: payload.description,
      observation: payload.observation ?? null,
    });

    return res.status(201).json(module);
  },
);

router.get(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  validate(listQuerySchema, 'query'),
  async (req, res) => {
    const { page, perPage, code, description } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const codeFilter = normalizeCodeFilter(code);
    const descriptionFilter = description?.trim();

    let codeExact: string[] | undefined;
    let codeContains: string | undefined;

    if (codeFilter) {
      if (codeFilter.exact.length > 1) {
        codeExact = codeFilter.exact;
      } else if (codeFilter.partial) {
        codeContains = codeFilter.partial;
      } else {
        codeExact = codeFilter.exact;
      }
    }

    const { data, total } = await listModules({
      page,
      perPage,
      codeExact,
      codeContains,
      description: descriptionFilter,
    });

    return res.json({
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  async (req, res) => {
    const { id } = req.params;

    const module = await findModuleById(id);

    if (!module) {
      return res.status(404).json({ message: 'Modulo nao encontrado.' });
    }

    return res.json(module);
  },
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(moduleSchema),
  async (req, res) => {
    const { id } = req.params;
    const payload = req.body as z.infer<typeof moduleSchema>;

    const module = await updateModule(id, {
      code: payload.code,
      description: payload.description,
      observation: payload.observation ?? null,
    });

    if (!module) {
      return res.status(404).json({ message: 'Modulo nao encontrado.' });
    }

    return res.json(module);
  },
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  async (req, res) => {
    const { id } = req.params;

    await deleteModule(id);

    return res.status(204).send();
  },
);

export const modulesRoutes: Router = router;
