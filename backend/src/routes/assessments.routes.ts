import { Router } from 'express';
import { z } from 'zod';

import { Role, SkillLevel } from '../domain/enums';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  listAssessments,
  upsertAssessment,
} from '../repositories/assessments.repository';
import {
  createCareerPlan,
  deleteCareerPlan,
  listCareerPlans,
  updateCareerPlan,
} from '../repositories/career-plans.repository';
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
  moduleIds: z.array(z.string().cuid()).optional(),
});

router.post(
  '/',
  authenticate,
  authorizeRoles(Role.MASTER),
  validate(assessmentSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof assessmentSchema>;

    const assessment = await upsertAssessment({
      collaboratorId: payload.collaboratorId,
      moduleId: payload.moduleId,
      targetLevel: payload.targetLevel,
      comment: payload.comment ?? null,
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

    const assessments = await listAssessments({
      collaboratorId: collaboratorId ?? undefined,
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

    const plan = await createCareerPlan({
      collaboratorId: payload.collaboratorId,
      objectives: payload.objectives,
      dueDate: payload.dueDate ? payload.dueDate.toISOString() : null,
      notes: payload.notes ?? null,
      moduleIds: payload.moduleIds ?? [],
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

    const hasScalarUpdates =
      payload.collaboratorId !== undefined ||
      payload.objectives !== undefined ||
      payload.dueDate !== undefined ||
      payload.notes !== undefined;

    const hasModuleUpdate = Array.isArray(payload.moduleIds);

    if (!hasScalarUpdates && !hasModuleUpdate) {
      return res
        .status(400)
        .json({ message: 'Informe pelo menos um campo para atualizar.' });
    }

    const plan = await updateCareerPlan(id, {
      collaboratorId: payload.collaboratorId,
      objectives: payload.objectives,
      dueDate: payload.dueDate === undefined ? undefined : payload.dueDate ? payload.dueDate.toISOString() : null,
      notes: payload.notes === undefined ? undefined : payload.notes ?? null,
      moduleIds: hasModuleUpdate ? payload.moduleIds ?? [] : undefined,
    });

    if (!plan) {
      return res
        .status(404)
        .json({ message: 'Plano de carreira nao encontrado.' });
    }

    return res.json(plan);
  },
);

router.delete(
  '/career-plans/:id',
  authenticate,
  authorizeRoles(Role.MASTER),
  async (req, res) => {
    const { id } = req.params;

    await deleteCareerPlan(id);

    return res.status(204).send();
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
        const message =
          error instanceof Error ? error.message : 'Perfil inexistente.';
        return res.status(400).json({ message });
      }
    }

    const plans = await listCareerPlans({
      collaboratorId: targetCollaboratorId ?? undefined,
    });

    return res.json(plans);
  },
);

export const assessmentsRoutes: Router = router;
