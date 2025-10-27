import { Role, SkillLevel } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { requireCollaboratorProfile } from '../utils/collaborator';

const router = Router();

const assessmentSchema = z.object({
  collaboratorId: z.string().cuid(),
  moduleId: z.string().cuid(),
  targetLevel: z.nativeEnum(SkillLevel),
  comment: z.string().optional().nullable(),
});

const assessmentQuerySchema = z.object({
  collaboratorId: z.string().cuid().optional(),
});

const careerPlanSchema = z.object({
  collaboratorId: z.string().cuid(),
  objectives: z.string().min(3),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(assessmentSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof assessmentSchema>;

    const assessment = await prisma.managerAssessment.upsert({
      where: {
        collaboratorId_moduleId: {
          collaboratorId: payload.collaboratorId,
          moduleId: payload.moduleId,
        },
      },
      update: {
        targetLevel: payload.targetLevel,
        comment: payload.comment ?? undefined,
      },
      create: {
        collaboratorId: payload.collaboratorId,
        moduleId: payload.moduleId,
        targetLevel: payload.targetLevel,
        comment: payload.comment ?? undefined,
      },
      include: {
        module: true,
      },
    });

    return res.status(201).json(assessment);
  },
);

router.get(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(assessmentQuerySchema, 'query'),
  async (req, res) => {
    const { collaboratorId } = req.query as unknown as z.infer<
      typeof assessmentQuerySchema
    >;

    const assessments = await prisma.managerAssessment.findMany({
      where: {
        ...(collaboratorId ? { collaboratorId } : {}),
      },
      include: {
        module: true,
      },
    });

    return res.json(assessments);
  },
);

router.post(
  '/career-plans',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(careerPlanSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof careerPlanSchema>;

    const plan = await prisma.careerPlan.create({
      data: {
        collaboratorId: payload.collaboratorId,
        objectives: payload.objectives,
        dueDate: payload.dueDate ?? undefined,
        notes: payload.notes ?? undefined,
      },
    });

    return res.status(201).json(plan);
  },
);

router.put(
  '/career-plans/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(careerPlanSchema.partial()),
  async (req, res) => {
    const { id } = req.params;
    const payload = req.body as Partial<z.infer<typeof careerPlanSchema>>;

    const data: Record<string, unknown> = {};

    if (payload.collaboratorId) {
      data.collaboratorId = payload.collaboratorId;
    }

    if (payload.objectives) {
      data.objectives = payload.objectives;
    }

    if (payload.dueDate !== undefined) {
      data.dueDate = payload.dueDate ?? null;
    }

    if (payload.notes !== undefined) {
      data.notes = payload.notes ?? null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: 'Informe pelo menos um campo para atualizar.',
      });
    }

    const plan = await prisma.careerPlan.update({
      where: { id },
      data,
    });

    return res.json(plan);
  },
);

router.get(
  '/career-plans',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  validate(
    z.object({
      collaboratorId: z.string().cuid().optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const { collaboratorId } = req.query as { collaboratorId?: string };
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
    }

    const plans = await prisma.careerPlan.findMany({
      where: targetCollaboratorId ? { collaboratorId: targetCollaboratorId } : {},
      orderBy: { createdAt: 'desc' },
    });

    return res.json(plans);
  },
);

export const assessmentsRoutes: Router = router;
