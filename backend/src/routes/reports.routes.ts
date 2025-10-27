import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { requireCollaboratorProfile } from '../utils/collaborator';
import { skillLevelScore } from '../utils/skill-level';

const router = Router();

const querySchema = z.object({
  collaboratorId: z.string().cuid().optional(),
  format: z.enum(['json', 'csv']).optional(),
});

router.get(
  '/coverage',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  validate(querySchema, 'query'),
  async (req, res) => {
    const { collaboratorId, format } = req.query as unknown as z.infer<
      typeof querySchema
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
    }

    if (!targetCollaboratorId) {
      return res.status(400).json({
        message: 'Informe um colaborador para gerar o relatório.',
      });
    }

    const [collaborator, modules, claims, assessments] = await Promise.all([
      prisma.collaboratorProfile.findUnique({
        where: { id: targetCollaboratorId },
        select: {
          id: true,
          fullName: true,
        },
      }),
      prisma.moduleRoutine.findMany(),
      prisma.skillClaim.findMany({
        where: { collaboratorId: targetCollaboratorId },
      }),
      prisma.managerAssessment.findMany({
        where: { collaboratorId: targetCollaboratorId },
      }),
    ]);

    if (!collaborator) {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }

    const entries = modules.map((module) => {
      const claim = claims.find((item) => item.moduleId === module.id);
      const assessment = assessments.find(
        (item) => item.moduleId === module.id,
      );

      const currentLevel = claim?.currentLevel ?? null;
      const targetLevel = assessment?.targetLevel ?? null;

      const gap =
        currentLevel !== null && targetLevel !== null
          ? skillLevelScore[targetLevel] - skillLevelScore[currentLevel]
          : null;

      return {
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.fullName,
        moduleId: module.id,
        moduleCode: module.code,
        moduleDescription: module.description,
        currentLevel,
        targetLevel,
        gap,
      };
    });

    if (format === 'csv') {
      const header = [
        'colaborador',
        'module_code',
        'module_description',
        'current_level',
        'target_level',
        'gap',
      ];

      const lines = entries.map((entry) => {
        return [
          `"${entry.collaboratorName}"`,
          `"${entry.moduleCode}"`,
          `"${entry.moduleDescription}"`,
          entry.currentLevel ?? '',
          entry.targetLevel ?? '',
          entry.gap ?? '',
        ].join(',');
      });

      const csv = [header.join(','), ...lines].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    return res.json(entries);
  },
);

export const reportsRoutes: Router = router;
