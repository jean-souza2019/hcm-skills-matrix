import cuid from 'cuid';

import {
  CollaboratorDetail,
  CollaboratorProfile,
  CollaboratorWithUser,
  CareerPlan,
  ManagerAssessment,
  SkillClaim,
} from '../domain/entities';
import { SkillLevel } from '../domain/enums';
import { getDatabase } from '../lib/database';
import { mapDate, parseJsonArray, stringifyJson } from './mappers';

export interface CollaboratorInput {
  fullName: string;
  admissionDate: Date | string;
  activities?: string[];
  notes?: string | null;
  userId?: string | null;
}

type RawCollaboratorRow = {
  id: string;
  userId: string | null;
  fullName: string;
  admissionDate: string;
  activities: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user_id?: string | null;
  user_email?: string | null;
};

const toIso = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const mapCollaborator = (row: RawCollaboratorRow): CollaboratorWithUser => ({
  id: row.id,
  userId: row.userId,
  fullName: row.fullName,
  admissionDate: mapDate(row.admissionDate),
  activities: parseJsonArray(row.activities ?? '[]'),
  notes: row.notes ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
  user:
    row.user_id && row.user_email
      ? {
          id: row.user_id,
          email: row.user_email,
        }
      : null,
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

const mapAssessment = (row: any): ManagerAssessment => ({
  id: row.id,
  collaboratorId: row.collaboratorId,
  moduleId: row.moduleId,
  targetLevel: row.targetLevel as SkillLevel,
  comment: row.comment ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

const mapCareerPlan = (row: any): CareerPlan => ({
  id: row.id,
  collaboratorId: row.collaboratorId,
  objectives: row.objectives,
  dueDate: row.dueDate ? mapDate(row.dueDate) : null,
  notes: row.notes ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

export async function createCollaborator(
  input: CollaboratorInput,
): Promise<CollaboratorWithUser> {
  const db = getDatabase();
  const id = cuid();

  await db.run(
    `
      INSERT INTO collaborator_profiles
        (id, userId, fullName, admissionDate, activities, notes, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    id,
    input.userId ?? null,
    input.fullName,
    toIso(input.admissionDate),
    stringifyJson(input.activities ?? []) ?? '[]',
    input.notes ?? null,
  );

  const collaborator = await findCollaboratorWithUserById(id);

  if (!collaborator) {
    throw new Error('Failed to create collaborator profile.');
  }

  return collaborator;
}

export async function updateCollaborator(
  id: string,
  input: CollaboratorInput,
): Promise<CollaboratorWithUser | null> {
  const db = getDatabase();

  await db.run(
    `
      UPDATE collaborator_profiles
      SET
        userId = ?,
        fullName = ?,
        admissionDate = ?,
        activities = ?,
        notes = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.userId ?? null,
    input.fullName,
    toIso(input.admissionDate),
    stringifyJson(input.activities ?? []) ?? '[]',
    input.notes ?? null,
    id,
  );

  return findCollaboratorWithUserById(id);
}

export async function deleteCollaborator(id: string): Promise<void> {
  const db = getDatabase();
  await db.run(`DELETE FROM collaborator_profiles WHERE id = ?`, id);
}

export async function findCollaboratorWithUserById(
  id: string,
): Promise<CollaboratorWithUser | null> {
  const db = getDatabase();
  const row = await db.get<RawCollaboratorRow>(
    `
      SELECT
        c.id,
        c.userId,
        c.fullName,
        c.admissionDate,
        c.activities,
        c.notes,
        c.createdAt,
        c.updatedAt,
        u.id as user_id,
        u.email as user_email
      FROM collaborator_profiles c
      LEFT JOIN users u ON u.id = c.userId
      WHERE c.id = ?
    `,
    id,
  );

  return row ? mapCollaborator(row) : null;
}

export async function findCollaboratorByUserId(
  userId: string,
): Promise<CollaboratorProfile | null> {
  const db = getDatabase();
  const row = await db.get<RawCollaboratorRow>(
    `
      SELECT
        id,
        userId,
        fullName,
        admissionDate,
        activities,
        notes,
        createdAt,
        updatedAt
      FROM collaborator_profiles
      WHERE userId = ?
    `,
    userId,
  );

  if (!row) {
    return null;
  }

  const collaborator = mapCollaborator(row);
  const { user, ...profile } = collaborator;
  return profile;
}

export interface CollaboratorListParams {
  page: number;
  perPage: number;
  name?: string;
}

export interface CollaboratorListResult {
  data: CollaboratorWithUser[];
  total: number;
}

export async function listCollaborators({
  page,
  perPage,
  name,
}: CollaboratorListParams): Promise<CollaboratorListResult> {
  const db = getDatabase();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (name) {
    whereClauses.push('LOWER(c.fullName) LIKE ?');
    params.push(`%${name.trim().toLowerCase()}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRow = await db.get<{ total: number }>(
    `
      SELECT COUNT(*) as total
      FROM collaborator_profiles c
      ${whereSql}
    `,
    ...params,
  );

  const rows = await db.all<RawCollaboratorRow[]>(
    `
      SELECT
        c.id,
        c.userId,
        c.fullName,
        c.admissionDate,
        c.activities,
        c.notes,
        c.createdAt,
        c.updatedAt,
        u.id as user_id,
        u.email as user_email
      FROM collaborator_profiles c
      LEFT JOIN users u ON u.id = c.userId
      ${whereSql}
      ORDER BY c.fullName ASC
      LIMIT ? OFFSET ?
    `,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  return {
    data: rows.map(mapCollaborator),
    total: totalRow?.total ?? 0,
  };
}

export async function listCollaboratorsRaw({
  name,
}: { name?: string } = {}): Promise<CollaboratorWithUser[]> {
  const db = getDatabase();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (name) {
    whereClauses.push('LOWER(c.fullName) LIKE ?');
    params.push(`%${name.trim().toLowerCase()}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const rows = await db.all<RawCollaboratorRow[]>(
    `
      SELECT
        c.id,
        c.userId,
        c.fullName,
        c.admissionDate,
        c.activities,
        c.notes,
        c.createdAt,
        c.updatedAt,
        u.id as user_id,
        u.email as user_email
      FROM collaborator_profiles c
      LEFT JOIN users u ON u.id = c.userId
      ${whereSql}
      ORDER BY c.fullName ASC
    `,
    ...params,
  );

  return rows.map(mapCollaborator);
}

export async function countCollaborators(): Promise<number> {
  const db = getDatabase();
  const row = await db.get<{ total: number }>(
    `
      SELECT COUNT(*) as total
      FROM collaborator_profiles
    `,
  );

  return row?.total ?? 0;
}

export async function findCollaboratorDetail(
  id: string,
): Promise<CollaboratorDetail | null> {
  const collaborator = await findCollaboratorWithUserById(id);

  if (!collaborator) {
    return null;
  }

  const db = getDatabase();

  const [claims, assessments, plans] = await Promise.all([
    db.all(
      `
        SELECT id, collaboratorId, moduleId, currentLevel, evidence, createdAt, updatedAt
        FROM skill_claims
        WHERE collaboratorId = ?
      `,
      id,
    ),
    db.all(
      `
        SELECT id, collaboratorId, moduleId, targetLevel, comment, createdAt, updatedAt
        FROM manager_assessments
        WHERE collaboratorId = ?
      `,
      id,
    ),
    db.all(
      `
        SELECT id, collaboratorId, objectives, dueDate, notes, createdAt, updatedAt
        FROM career_plans
        WHERE collaboratorId = ?
        ORDER BY createdAt DESC
      `,
      id,
    ),
  ]);

  return {
    ...collaborator,
    skillClaims: claims.map(mapSkillClaim),
    assessments: assessments.map(mapAssessment),
    careerPlans: plans.map(mapCareerPlan),
  };
}
