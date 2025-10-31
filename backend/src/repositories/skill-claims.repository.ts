import cuid from 'cuid';

import {
  ModuleRoutine,
  SkillClaim,
  SkillClaimWithModule,
} from '../domain/entities';
import { SkillLevel } from '../domain/enums';
import { getDatabase } from '../lib/database';
import { mapDate } from './mappers';

const mapModule = (row: any): ModuleRoutine => ({
  id: row.module_id,
  code: row.module_code,
  description: row.module_description,
  observation: row.module_observation ?? null,
  createdAt: mapDate(row.module_createdAt),
  updatedAt: mapDate(row.module_updatedAt),
});

const mapSkillClaim = (row: any): SkillClaim => ({
  id: row.id,
  collaboratorId: row.collaboratorId,
  moduleId: row.moduleId,
  currentLevel: row.currentLevel as SkillLevel,
  evidence: row.evidence ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

const mapSkillClaimWithModule = (row: any): SkillClaimWithModule => ({
  ...mapSkillClaim(row),
  module: mapModule(row),
});

export interface SkillClaimInput {
  collaboratorId: string;
  moduleId: string;
  currentLevel: SkillLevel;
  evidence?: string | null;
}

export async function findSkillClaimById(id: string): Promise<SkillClaim | null> {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT id, collaboratorId, moduleId, currentLevel, evidence, createdAt, updatedAt
      FROM skill_claims
      WHERE id = ?
    `,
    id,
  );

  return row ? mapSkillClaim(row) : null;
}

export async function findSkillClaimWithModuleById(
  id: string,
): Promise<SkillClaimWithModule | null> {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT
        sc.id,
        sc.collaboratorId,
        sc.moduleId,
        sc.currentLevel,
        sc.evidence,
        sc.createdAt,
        sc.updatedAt,
        m.id as module_id,
        m.code as module_code,
        m.description as module_description,
        m.observation as module_observation,
        m.createdAt as module_createdAt,
        m.updatedAt as module_updatedAt
      FROM skill_claims sc
      JOIN module_routines m ON m.id = sc.moduleId
      WHERE sc.id = ?
    `,
    id,
  );

  return row ? mapSkillClaimWithModule(row) : null;
}

export async function upsertSkillClaim(
  input: SkillClaimInput,
): Promise<SkillClaimWithModule> {
  const db = getDatabase();

  const existing = await db.get<{ id: string }>(
    `
      SELECT id
      FROM skill_claims
      WHERE collaboratorId = ? AND moduleId = ?
    `,
    input.collaboratorId,
    input.moduleId,
  );

  if (existing) {
    await db.run(
      `
        UPDATE skill_claims
        SET currentLevel = ?, evidence = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      input.currentLevel,
      input.evidence ?? null,
      existing.id,
    );

    const claim = await findSkillClaimWithModuleById(existing.id);

    if (!claim) {
      throw new Error('Failed to update skill claim.');
    }

    return claim;
  }

  const id = cuid();

  await db.run(
    `
      INSERT INTO skill_claims
        (id, collaboratorId, moduleId, currentLevel, evidence, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    id,
    input.collaboratorId,
    input.moduleId,
    input.currentLevel,
    input.evidence ?? null,
  );

  const claim = await findSkillClaimWithModuleById(id);

  if (!claim) {
    throw new Error('Failed to create skill claim.');
  }

  return claim;
}

export async function updateSkillClaim(
  id: string,
  input: Partial<Omit<SkillClaimInput, 'collaboratorId' | 'moduleId'>>,
): Promise<SkillClaimWithModule | null> {
  const db = getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.currentLevel !== undefined) {
    fields.push('currentLevel = ?');
    values.push(input.currentLevel);
  }

  if (input.evidence !== undefined) {
    fields.push('evidence = ?');
    values.push(input.evidence ?? null);
  }

  if (fields.length === 0) {
    return findSkillClaimWithModuleById(id);
  }

  values.push(id);

  await db.run(
    `
      UPDATE skill_claims
      SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ...values,
  );

  return findSkillClaimWithModuleById(id);
}

export interface SkillClaimListParams {
  collaboratorId?: string;
  includeModule?: boolean;
}

export async function listSkillClaims(
  params: SkillClaimListParams = {},
): Promise<(SkillClaim | SkillClaimWithModule)[]> {
  const db = getDatabase();

  if (params.includeModule) {
    const rows = await db.all(
      `
        SELECT
          sc.id,
          sc.collaboratorId,
          sc.moduleId,
          sc.currentLevel,
          sc.evidence,
          sc.createdAt,
          sc.updatedAt,
          m.id as module_id,
          m.code as module_code,
          m.description as module_description,
          m.observation as module_observation,
          m.createdAt as module_createdAt,
          m.updatedAt as module_updatedAt
        FROM skill_claims sc
        JOIN module_routines m ON m.id = sc.moduleId
        ${params.collaboratorId ? 'WHERE sc.collaboratorId = ?' : ''}
      `,
      ...(params.collaboratorId ? [params.collaboratorId] : []),
    );

    return rows.map(mapSkillClaimWithModule);
  }

  const rows = await db.all(
    `
      SELECT id, collaboratorId, moduleId, currentLevel, evidence, createdAt, updatedAt
      FROM skill_claims
      ${params.collaboratorId ? 'WHERE collaboratorId = ?' : ''}
    `,
    ...(params.collaboratorId ? [params.collaboratorId] : []),
  );

  return rows.map(mapSkillClaim);
}

export async function listAllSkillClaims(): Promise<SkillClaim[]> {
  const claims = await listSkillClaims();
  return claims as SkillClaim[];
}
