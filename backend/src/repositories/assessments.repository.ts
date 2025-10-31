import cuid from 'cuid';

import {
  ManagerAssessment,
  ManagerAssessmentWithModule,
  ModuleRoutine,
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

const mapAssessment = (row: any): ManagerAssessment => ({
  id: row.id,
  collaboratorId: row.collaboratorId,
  moduleId: row.moduleId,
  targetLevel: row.targetLevel as SkillLevel,
  comment: row.comment ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

const mapAssessmentWithModule = (row: any): ManagerAssessmentWithModule => ({
  ...mapAssessment(row),
  module: mapModule(row),
});

export interface AssessmentInput {
  collaboratorId: string;
  moduleId: string;
  targetLevel: SkillLevel;
  comment?: string | null;
}

export async function upsertAssessment(
  input: AssessmentInput,
): Promise<ManagerAssessmentWithModule> {
  const db = getDatabase();

  const existing = await db.get<{ id: string }>(
    `
      SELECT id
      FROM manager_assessments
      WHERE collaboratorId = ? AND moduleId = ?
    `,
    input.collaboratorId,
    input.moduleId,
  );

  if (existing) {
    await db.run(
      `
        UPDATE manager_assessments
        SET targetLevel = ?, comment = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      input.targetLevel,
      input.comment ?? null,
      existing.id,
    );

    const assessment = await findAssessmentWithModuleById(existing.id);

    if (!assessment) {
      throw new Error('Failed to update assessment.');
    }

    return assessment;
  }

  const id = cuid();

  await db.run(
    `
      INSERT INTO manager_assessments
        (id, collaboratorId, moduleId, targetLevel, comment, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    id,
    input.collaboratorId,
    input.moduleId,
    input.targetLevel,
    input.comment ?? null,
  );

  const assessment = await findAssessmentWithModuleById(id);

  if (!assessment) {
    throw new Error('Failed to create assessment.');
  }

  return assessment;
}

export async function findAssessmentWithModuleById(
  id: string,
): Promise<ManagerAssessmentWithModule | null> {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT
        ma.id,
        ma.collaboratorId,
        ma.moduleId,
        ma.targetLevel,
        ma.comment,
        ma.createdAt,
        ma.updatedAt,
        m.id as module_id,
        m.code as module_code,
        m.description as module_description,
        m.observation as module_observation,
        m.createdAt as module_createdAt,
        m.updatedAt as module_updatedAt
      FROM manager_assessments ma
      JOIN module_routines m ON m.id = ma.moduleId
      WHERE ma.id = ?
    `,
    id,
  );

  return row ? mapAssessmentWithModule(row) : null;
}

export interface AssessmentListParams {
  collaboratorId?: string;
}

export async function listAssessments(
  params: AssessmentListParams = {},
): Promise<ManagerAssessmentWithModule[]> {
  const db = getDatabase();
  const rows = await db.all(
    `
      SELECT
        ma.id,
        ma.collaboratorId,
        ma.moduleId,
        ma.targetLevel,
        ma.comment,
        ma.createdAt,
        ma.updatedAt,
        m.id as module_id,
        m.code as module_code,
        m.description as module_description,
        m.observation as module_observation,
        m.createdAt as module_createdAt,
        m.updatedAt as module_updatedAt
      FROM manager_assessments ma
      JOIN module_routines m ON m.id = ma.moduleId
      ${params.collaboratorId ? 'WHERE ma.collaboratorId = ?' : ''}
    `,
    ...(params.collaboratorId ? [params.collaboratorId] : []),
  );

  return rows.map(mapAssessmentWithModule);
}

export async function listAllAssessments(): Promise<ManagerAssessment[]> {
  const db = getDatabase();
  const rows = await db.all(
    `
      SELECT id, collaboratorId, moduleId, targetLevel, comment, createdAt, updatedAt
      FROM manager_assessments
    `,
  );

  return rows.map(mapAssessment);
}
