import { Router } from 'express';
import { z } from 'zod';

import { Role, SkillLevel } from '../domain/enums';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRoles } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  findSkillClaimById,
  listSkillClaims,
  updateSkillClaim,
  upsertSkillClaim,
} from '../repositories/skill-claims.repository';
import { findCollaboratorProfileByUserId, requireCollaboratorProfile } from '../utils/collaborator';

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

    try {
      const profile = await requireCollaboratorProfile(user.id);

      const claim = await upsertSkillClaim({
        collaboratorId: profile.id,
        moduleId: payload.moduleId,
        currentLevel: payload.currentLevel,
        evidence: payload.evidence ?? null,
      });

      return res.status(201).json(claim);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Perfil inexistente.';
      return res.status(400).json({ message });
    }
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
        const message =
          error instanceof Error ? error.message : 'Perfil inexistente.';
        return res.status(400).json({ message });
      }
    } else if (me) {
      const profile = await findCollaboratorProfileByUserId(user.id);
      targetCollaboratorId = profile?.id ?? undefined;
    }

    const claims = await listSkillClaims({
      collaboratorId: targetCollaboratorId,
      includeModule: true,
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
      const message =
        error instanceof Error ? error.message : 'Perfil inexistente.';
      return res.status(400).json({ message });
    }

    const existing = await findSkillClaimById(id);

    if (!existing || existing.collaboratorId !== collaboratorId) {
      return res.status(404).json({ message: 'Registro nao encontrado.' });
    }

    const updated = await updateSkillClaim(id, {
      currentLevel: payload.currentLevel,
      evidence: payload.evidence ?? null,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Registro nao encontrado.' });
    }

    return res.json(updated);
  },
);

export const skillsRoutes: Router = router;
