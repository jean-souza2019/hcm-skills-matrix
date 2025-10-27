import { Role, SkillLevel } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { requireCollaboratorProfile } from '../utils/collaborator';

const router = Router();

const claimSchema = z.object({
  moduleId: z.string().cuid(),
  currentLevel: z.nativeEnum(SkillLevel),
  evidence: z.string().optional().nullable(),
});

const updateSchema = z.object({
  currentLevel: z.nativeEnum(SkillLevel).optional(),
  evidence: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  me: z.coerce.boolean().optional(),
  collaboratorId: z.string().cuid().optional(),
});

router.post(
  '/claim',
  authenticate,
  authorizeRoles(Role.COLABORADOR),
  validate(claimSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof claimSchema>;
    const user = req.user!;

    let collaboratorId: string;
    try {
      const profile = await requireCollaboratorProfile(user.id);
      collaboratorId = profile.id;
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Perfil inexistente.',
      });
    }

    const claim = await prisma.skillClaim.upsert({
      where: {
        collaboratorId_moduleId: {
          collaboratorId,
          moduleId: payload.moduleId,
        },
      },
      update: {
        currentLevel: payload.currentLevel,
        evidence: payload.evidence ?? undefined,
      },
      create: {
        collaboratorId,
        moduleId: payload.moduleId,
        currentLevel: payload.currentLevel,
        evidence: payload.evidence ?? undefined,
      },
      include: {
        module: true,
      },
    });

    return res.status(201).json(claim);
  },
);

router.get(
  '/claim',
  authenticate,
  authorizeRoles(Role.COLABORADOR, Role.MASTER),
  validate(listQuerySchema, 'query'),
  async (req, res) => {
    const { me, collaboratorId } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;
    const user = req.user!;

    let targetCollaboratorId = collaboratorId;

    if (user.role === Role.COLABORADOR) {
      try {
        const profile = await requireCollaboratorProfile(user.id);
        targetCollaboratorId = profile.id;
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : 'Perfil inexistente.',
        });
      }
    } else if (me) {
      const profile = await prisma.collaboratorProfile.findUnique({
        where: { userId: user.id },
      });
      targetCollaboratorId = profile?.id ?? undefined;
    }

    const where = targetCollaboratorId
      ? { collaboratorId: targetCollaboratorId }
      : undefined;

    const claims = await prisma.skillClaim.findMany({
      where,
      include: {
        module: true,
      },
    });

    return res.json(claims);
  },
);

router.put(
  '/claim/:id',
  authenticate,
  authorizeRoles(Role.COLABORADOR),
  validate(updateSchema),
  async (req, res) => {
    const { id } = req.params;
    const payload = req.body as z.infer<typeof updateSchema>;
    const user = req.user!;

    let collaboratorId: string;
    try {
      const profile = await requireCollaboratorProfile(user.id);
      collaboratorId = profile.id;
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Perfil inexistente.',
      });
    }

    const existing = await prisma.skillClaim.findUnique({
      where: { id },
    });

    if (!existing || existing.collaboratorId !== collaboratorId) {
      return res.status(404).json({ message: 'Registro não encontrado.' });
    }

    const updated = await prisma.skillClaim.update({
      where: { id },
      data: {
        ...(payload.currentLevel ? { currentLevel: payload.currentLevel } : {}),
        evidence: payload.evidence ?? undefined,
      },
      include: {
        module: true,
      },
    });

    return res.json(updated);
  },
);

export const skillsRoutes: Router = router;
