import { Router } from 'express';
import { z } from 'zod';
import { hash } from 'bcryptjs';

import { Role } from '../domain/enums';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { generateTemporaryPassword } from '../utils/password';
import {
  createCollaborator,
  deleteCollaborator,
  findCollaboratorDetail,
  findCollaboratorWithUserById,
  listCollaborators,
  listCollaboratorsRaw,
  updateCollaborator,
} from '../repositories/collaborators.repository';
import {
  createUser,
  deleteUserById,
  findUserByEmail,
  updateUser,
} from '../repositories/users.repository';
import { withTransaction } from '../lib/database';

const router = Router();

const collaboratorSchema = z
  .object({
    fullName: z.string().min(3),
    admissionDate: z.coerce.date(),
    activities: z.array(z.string()).optional().default([]),
    notes: z.string().optional().nullable(),
    userId: z.string().cuid().optional().nullable(),
    createAccess: z.boolean().optional().default(false),
    accessEmail: z.string().email().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.createAccess && !data.accessEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accessEmail'],
        message: 'Informe um e-mail valido para criar o acesso.',
      });
    }
  });

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  name: z.string().optional(),
  activity: z.string().optional(),
});

type CollaboratorPayload = z.infer<typeof collaboratorSchema>;

type AccessCredentials = {
  email: string;
  temporaryPassword: string;
};

async function ensureUserCreation(
  payload: CollaboratorPayload,
  existingUserId?: string | null,
): Promise<{ userId?: string | null; credentials: AccessCredentials | null }> {
  if (existingUserId) {
    return {
      userId: existingUserId,
      credentials: null,
    };
  }

  if (!payload.createAccess) {
    return {
      userId: payload.userId ?? null,
      credentials: null,
    };
  }

  const email = payload.accessEmail?.trim().toLowerCase();

  if (!email) {
    throw new Error('ACCESS_EMAIL_REQUIRED');
  }

  const alreadyExists = await findUserByEmail(email);

  if (alreadyExists) {
    throw new Error('ACCESS_EMAIL_IN_USE');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hash(temporaryPassword, 10);

  const user = await createUser({
    email,
    passwordHash,
    role: Role.COLABORADOR,
    mustChangePassword: true,
  });

  return {
    userId: user.id,
    credentials: {
      email: user.email,
      temporaryPassword,
    },
  };
}

router.post(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(collaboratorSchema),
  async (req, res) => {
    const payload = req.body as CollaboratorPayload;

    try {
      const result = await withTransaction(async () => {
        const { userId, credentials } = await ensureUserCreation(payload);

        const collaborator = await createCollaborator({
          fullName: payload.fullName,
          admissionDate: payload.admissionDate,
          activities: payload.activities ?? [],
          notes: payload.notes ?? null,
          userId: userId ?? null,
        });

        return { collaborator, credentials };
      });

      return res.status(201).json({
        collaborator: result.collaborator,
        accessCredentials: result.credentials ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ACCESS_EMAIL_IN_USE') {
          return res
            .status(409)
            .json({ message: 'Ja existe um usuario cadastrado com este e-mail.' });
        }

        if (error.message === 'ACCESS_EMAIL_REQUIRED') {
          return res
            .status(400)
            .json({ message: 'Informe o e-mail para criar o acesso.' });
        }
      }

      throw error;
    }
  },
);

router.get(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(querySchema, 'query'),
  async (req, res) => {
    const { page, perPage, name, activity } = req.query as unknown as z.infer<
      typeof querySchema
    >;

    const normalizedName = name?.trim();

    if (activity) {
      const all = await listCollaboratorsRaw({
        name: normalizedName,
      });

      const filtered = all.filter((item) =>
        item.activities.includes(activity),
      );

      const start = (page - 1) * perPage;
      const paginated = filtered.slice(start, start + perPage);

      return res.json({
        data: paginated,
        meta: {
          page,
          perPage,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / perPage),
        },
      });
    }

    const { data, total } = await listCollaborators({
      page,
      perPage,
      name: normalizedName,
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
  authorizeRoles(Role.MASTER),
  async (req, res) => {
    const { id } = req.params;

    const collaborator = await findCollaboratorDetail(id);

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador nao encontrado.' });
    }

    return res.json(collaborator);
  },
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(collaboratorSchema),
  async (req, res) => {
    const { id } = req.params;
    const payload = req.body as CollaboratorPayload;

    const existing = await findCollaboratorWithUserById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Colaborador nao encontrado.' });
    }

    if (existing.userId && payload.createAccess) {
      return res
        .status(400)
        .json({ message: 'O colaborador ja possui um usuario vinculado.' });
    }

    try {
      const result = await withTransaction(async () => {
        const { userId, credentials } = await ensureUserCreation(
          payload,
          existing.userId,
        );

        const collaborator = await updateCollaborator(id, {
          fullName: payload.fullName,
          admissionDate: payload.admissionDate,
          activities: payload.activities ?? [],
          notes: payload.notes ?? null,
          userId: userId ?? null,
        });

        return { collaborator, credentials };
      });

      if (!result.collaborator) {
        return res.status(404).json({ message: 'Colaborador nao encontrado.' });
      }

      return res.json({
        collaborator: result.collaborator,
        accessCredentials: result.credentials ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ACCESS_EMAIL_IN_USE') {
          return res
            .status(409)
            .json({ message: 'Ja existe um usuario cadastrado com este e-mail.' });
        }
        if (error.message === 'ACCESS_EMAIL_REQUIRED') {
          return res.status(400).json({ message: 'Informe o e-mail para criar o acesso.' });
        }
      }
      throw error;
    }
  },
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  async (req, res) => {
    const { id } = req.params;

    const collaborator = await findCollaboratorWithUserById(id);

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador nao encontrado.' });
    }

    await withTransaction(async () => {
      await deleteCollaborator(id);
      if (collaborator.userId) {
        await deleteUserById(collaborator.userId);
      }
    });

    return res.status(204).send();
  },
);

router.post(
  '/:id/reset-access',
  authenticate,
  authorizeRoles(Role.MASTER),
  async (req, res) => {
    const { id } = req.params;

    const collaborator = await findCollaboratorWithUserById(id);

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador nao encontrado.' });
    }

    if (!collaborator.user) {
      return res.status(400).json({
        message: 'Este colaborador ainda nao possui usuario vinculado.',
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 10);

    await updateUser(collaborator.user.id, {
      passwordHash,
      mustChangePassword: true,
    });

    return res.json({
      accessCredentials: {
        email: collaborator.user.email,
        temporaryPassword,
      },
    });
  },
);

export const collaboratorsRoutes: Router = router;
