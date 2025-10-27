import { Role, SkillLevel } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { skillLevelScore } from '../utils/skill-level';

const router = Router();

router.get(
  '/kpis',
  authenticate,
  authorizeRoles(Role.MASTER),
  async (_req, res) => {
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
  authorizeRoles(Role.MASTER),
  async (_req, res) => {
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
