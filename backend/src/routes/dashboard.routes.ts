import { Role, SkillLevel } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { skillLevelScore } from '../utils/skill-level';
import { requireCollaboratorProfile } from '../utils/collaborator';

const router = Router();

router.get(
  '/kpis',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  async (req, res) => {
    if (req.user?.role === Role.COLABORADOR) {
      try {
        const profile = await requireCollaboratorProfile(req.user.id);

        const [totalModules, claims, assessments] = await Promise.all([
          prisma.moduleRoutine.count(),
          prisma.skillClaim.findMany({
            where: { collaboratorId: profile.id },
          }),
          prisma.managerAssessment.findMany({
            where: { collaboratorId: profile.id },
          }),
        ]);

        const claimMap = new Map<string, SkillLevel>();
        claims.forEach((claim) => {
          claimMap.set(claim.moduleId, claim.currentLevel);
        });

        const gaps = assessments
          .map((assessment) => {
            const claimLevel = claimMap.get(assessment.moduleId);
            if (!claimLevel) return null;
            return (
              skillLevelScore[assessment.targetLevel] - skillLevelScore[claimLevel]
            );
          })
          .filter((gap): gap is number => gap !== null);

        const averageGap =
          gaps.length > 0
            ? Number(
                (gaps.reduce((acc, gap) => acc + gap, 0) / gaps.length).toFixed(2),
              )
            : 0;

        return res.json({
          totalCollaborators: 1,
          totalModules,
          totalClaims: claims.length,
          totalAssessments: assessments.length,
          averageGap,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível localizar o perfil do colaborador.';
        return res.status(400).json({ message });
      }
    }

    const [totalCollaborators, totalModules, totalClaims, assessments, claims] =
      await Promise.all([
        prisma.collaboratorProfile.count(),
        prisma.moduleRoutine.count(),
        prisma.skillClaim.count(),
        prisma.managerAssessment.findMany(),
        prisma.skillClaim.findMany({
          select: {
            collaboratorId: true,
            moduleId: true,
            currentLevel: true,
          },
        }),
      ]);

    const totalAssessments = assessments.length;

    const claimMap = new Map<string, SkillLevel>();
    claims.forEach((claim) => {
      claimMap.set(
        `${claim.collaboratorId}:${claim.moduleId}`,
        claim.currentLevel,
      );
    });

    const gaps = assessments
      .map((assessment) => {
        const key = `${assessment.collaboratorId}:${assessment.moduleId}`;
        const claimLevel = claimMap.get(key);

        if (!claimLevel) {
          return null;
        }

        return skillLevelScore[assessment.targetLevel] - skillLevelScore[claimLevel];
      })
      .filter((gap): gap is number => gap !== null);

    const averageGap =
      gaps.length > 0
        ? Number(
            (gaps.reduce((acc, gap) => acc + gap, 0) / gaps.length).toFixed(2),
          )
        : 0;

    return res.json({
      totalCollaborators,
      totalModules,
      totalClaims,
      totalAssessments,
      averageGap,
    });
  },
);

router.get(
  '/trends',
  authenticate,
  authorizeRoles(Role.MASTER, Role.COLABORADOR),
  async (req, res) => {
    if (req.user?.role === Role.COLABORADOR) {
      try {
        const profile = await requireCollaboratorProfile(req.user.id);

        const [claims, assessments, modules] = await Promise.all([
          prisma.skillClaim.findMany({ where: { collaboratorId: profile.id } }),
          prisma.managerAssessment.findMany({
            where: { collaboratorId: profile.id },
          }),
          prisma.moduleRoutine.findMany(),
        ]);

        const levelDistribution = Object.values(SkillLevel).map((level) => ({
          level,
          count: claims.filter((claim) => claim.currentLevel === level).length,
        }));

        const gapByModule = assessments.map((assessment) => {
          const module = modules.find((item) => item.id === assessment.moduleId);
          const claim = claims.find((item) => item.moduleId === assessment.moduleId);

          if (!module || !claim) {
            return null;
          }

          const gap =
            skillLevelScore[assessment.targetLevel] - skillLevelScore[claim.currentLevel];

          return {
            moduleId: module.id,
            moduleCode: module.code,
            moduleDescription: module.description,
            gap: Number(gap.toFixed(2)),
          };
        });

        const filteredGaps = gapByModule
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

        return res.json({
          levelDistribution,
          topGaps: filteredGaps.slice(0, 5),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível localizar o perfil do colaborador.';
        return res.status(400).json({ message });
      }
    }

    const [claims, assessments, modules] = await Promise.all([
      prisma.skillClaim.findMany(),
      prisma.managerAssessment.findMany(),
      prisma.moduleRoutine.findMany(),
    ]);

    const levelDistribution = Object.values(SkillLevel).map((level) => ({
      level,
      count: claims.filter((claim) => claim.currentLevel === level).length,
    }));

    const gapByModule = modules.map((module) => {
      const moduleClaims = claims.filter((claim) => claim.moduleId === module.id);
      const moduleAssessment = assessments.filter(
        (assessment) => assessment.moduleId === module.id,
      );

      if (moduleClaims.length === 0 || moduleAssessment.length === 0) {
        return {
          moduleId: module.id,
          moduleCode: module.code,
          moduleDescription: module.description,
          gap: null,
        };
      }

      const averageClaimLevel =
        moduleClaims.reduce(
          (total, claim) => total + skillLevelScore[claim.currentLevel],
          0,
        ) / moduleClaims.length;

      const averageAssessmentLevel =
        moduleAssessment.reduce(
          (total, assessment) => total + skillLevelScore[assessment.targetLevel],
          0,
        ) / moduleAssessment.length;

      const gap = Number((averageAssessmentLevel - averageClaimLevel).toFixed(2));

      return {
        moduleId: module.id,
        moduleCode: module.code,
        moduleDescription: module.description,
        gap,
      };
    });

    const topGaps = gapByModule
      .filter((item) => item.gap !== null)
      .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
      .slice(0, 5);

    return res.json({
      levelDistribution,
      topGaps,
    });
  },
);

export const dashboardRoutes: Router = router;
