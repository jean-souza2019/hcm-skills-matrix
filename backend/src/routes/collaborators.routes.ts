import { Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { hash } from 'bcryptjs';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { generateTemporaryPassword } from '../utils/password';

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
        message: 'Informe um e-mail válido para criar o acesso.',
      });
    }
  });

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  name: z.string().optional(),
  activity: z.string().optional(),
});

const collaboratorInclude = {
  user: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

type CollaboratorPayload = z.infer<typeof collaboratorSchema>;

async function ensureUserCreation(
  tx: Prisma.TransactionClient,
  payload: CollaboratorPayload,
  existingUserId?: string | null,
) {
  if (existingUserId) {
    return {
      userId: existingUserId,
      credentials: null,
    };
  }

  if (!payload.createAccess) {
    return {
      userId: payload.userId ?? undefined,
      credentials: null,
    };
  }

  const email = payload.accessEmail?.trim().toLowerCase();

  if (!email) {
    throw new Error('ACCESS_EMAIL_REQUIRED');
  }

  const alreadyExists = await tx.user.findUnique({
    where: { email },
  });

  if (alreadyExists) {
    throw new Error('ACCESS_EMAIL_IN_USE');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hash(temporaryPassword, 10);

  const user = await tx.user.create({
    data: {
      email,
      passwordHash,
      role: Role.COLABORADOR,
      mustChangePassword: true,
    },
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
      const result = await prisma.$transaction(async (tx) => {
        const { userId, credentials } = await ensureUserCreation(
          tx,
          payload,
          payload.userId ?? undefined,
        );

        const collaborator = await tx.collaboratorProfile.create({
          data: {
            fullName: payload.fullName,
            admissionDate: payload.admissionDate,
            activities: payload.activities ?? [],
            notes: payload.notes ?? undefined,
            userId,
          },
          include: collaboratorInclude,
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
            .json({ message: 'Já existe um usuário cadastrado com este e-mail.' });
        }
        if (error.message === 'ACCESS_EMAIL_REQUIRED') {
          return res.status(400).json({ message: 'Informe o e-mail para criar o acesso.' });
        }
      }
      throw error;
    }
  },
);

router.get(
  '/', authenticate, authorizeRoles(Role.MASTER), validate(querySchema, 'query'), async (req, res) => {
    const { page, perPage, name, activity } = req.query as unknown as z.infer<
      typeof querySchema
    >;

    const normalizedName = name?.trim();

    const baseWhere = normalizedName
      ? {
          fullName: {
            contains: normalizedName,
          },
        }
      : {};
    if (activity) {
      const all = await prisma.collaboratorProfile.findMany({
        where: baseWhere,
        orderBy: { fullName: 'asc' },
      });

      const filtered = all.filter((item) =>
        Array.isArray(item.activities)
          ? item.activities.includes(activity)
          : false,
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

    const [total, items] = await Promise.all([
      prisma.collaboratorProfile.count({ where: baseWhere }),
      prisma.collaboratorProfile.findMany({
        where: baseWhere,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: collaboratorInclude,
      }),
    ]);

    return res.json({
      data: items,
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

    const collaborator = await prisma.collaboratorProfile.findUnique({
      where: { id },
      include: {
        user: collaboratorInclude.user,
        skillClaims: true,
        assessments: true,
        careerPlans: true,
      },
    });

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
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

    const existing = await prisma.collaboratorProfile.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    if (existing.userId && payload.createAccess) {
      return res
        .status(400)
        .json({ message: 'O colaborador já possui um usuário vinculado.' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const { userId, credentials } = await ensureUserCreation(
          tx,
          payload,
          existing.userId ?? undefined,
        );

        const collaborator = await tx.collaboratorProfile.update({
          where: { id },
          data: {
            fullName: payload.fullName,
            admissionDate: payload.admissionDate,
            activities: payload.activities ?? [],
            notes: payload.notes ?? undefined,
            userId,
          },
          include: collaboratorInclude,
        });

        return { collaborator, credentials };
      });

      return res.json({
        collaborator: result.collaborator,
        accessCredentials: result.credentials ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'ACCESS_EMAIL_IN_USE') {
        return res.status(409).json({ message: 'Já existe um usuário cadastrado com este e-mail.' });
      }
      if (error instanceof Error && error.message === 'ACCESS_EMAIL_REQUIRED') {
        return res.status(400).json({ message: 'Informe o e-mail para criar o acesso.' });
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

    const collaborator = await prisma.collaboratorProfile.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    });

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.collaboratorProfile.delete({
        where: { id },
      });

      if (collaborator.userId) {
        await tx.user.delete({
          where: { id: collaborator.userId },
        });
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

    const collaborator = await prisma.collaboratorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    if (!collaborator.user) {
      return res.status(400).json({
        message: 'Este colaborador ainda não possui usuário vinculado.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hash(temporaryPassword, 10);

      const updatedUser = await tx.user.update({
        where: { id: collaborator.user!.id },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
        select: {
          email: true,
        },
      });

      return {
        accessCredentials: {
          email: updatedUser.email,
          temporaryPassword,
        },
      };
    });

    return res.json(result);
  },
);

export const collaboratorsRoutes: Router = router;
