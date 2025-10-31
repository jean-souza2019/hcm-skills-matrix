import cuid from 'cuid';

import { ModuleRoutine } from '../domain/entities';
import { getDatabase } from '../lib/database';
import { mapDate } from './mappers';

export interface ModuleInput {
  code: string;
  description: string;
  observation?: string | null;
}

const mapModule = (row: any): ModuleRoutine => ({
  id: row.id,
  code: row.code,
  description: row.description,
  observation: row.observation ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

export async function createModule(input: ModuleInput): Promise<ModuleRoutine> {
  const db = getDatabase();
  const id = cuid();
  const normalizedCode = input.code.trim().toUpperCase();

  await db.run(
    `
      INSERT INTO module_routines
        (id, code, description, observation, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    id,
    normalizedCode,
    input.description,
    input.observation ?? null,
  );

  const module = await findModuleById(id);

  if (!module) {
    throw new Error('Failed to create module.');
  }

  return module;
}

export async function updateModule(
  id: string,
  input: ModuleInput,
): Promise<ModuleRoutine | null> {
  const db = getDatabase();

  await db.run(
    `
      UPDATE module_routines
      SET
        code = ?,
        description = ?,
        observation = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.code.trim().toUpperCase(),
    input.description,
    input.observation ?? null,
    id,
  );

  return findModuleById(id);
}

export async function deleteModule(id: string): Promise<void> {
  const db = getDatabase();
  await db.run(`DELETE FROM module_routines WHERE id = ?`, id);
}

export async function findModuleById(id: string): Promise<ModuleRoutine | null> {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT id, code, description, observation, createdAt, updatedAt
      FROM module_routines
      WHERE id = ?
    `,
    id,
  );

  return row ? mapModule(row) : null;
}

export async function findModuleByCode(code: string): Promise<ModuleRoutine | null> {
  const db = getDatabase();
  const row = await db.get(
    `
      SELECT id, code, description, observation, createdAt, updatedAt
      FROM module_routines
      WHERE UPPER(code) = UPPER(?)
    `,
    code.trim(),
  );

  return row ? mapModule(row) : null;
}

export interface ModuleListParams {
  page: number;
  perPage: number;
  codeExact?: string[];
  codeContains?: string;
  description?: string;
}

export interface ModuleListResult {
  data: ModuleRoutine[];
  total: number;
}

export async function listAllModules(): Promise<ModuleRoutine[]> {
  const db = getDatabase();
  const rows = await db.all(
    `
      SELECT id, code, description, observation, createdAt, updatedAt
      FROM module_routines
      ORDER BY code ASC
    `,
  );

  return rows.map(mapModule);
}

export async function listModules({
  page,
  perPage,
  codeExact,
  codeContains,
  description,
}: ModuleListParams): Promise<ModuleListResult> {
  const db = getDatabase();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (codeExact && codeExact.length > 0) {
    const placeholders = codeExact.map(() => '?').join(', ');
    whereClauses.push(`UPPER(code) IN (${placeholders})`);
    params.push(...codeExact.map((code) => code.toUpperCase()));
  }

  if (codeContains) {
    whereClauses.push('UPPER(code) LIKE ?');
    params.push(`%${codeContains.toUpperCase()}%`);
  }

  if (description) {
    whereClauses.push('LOWER(description) LIKE ?');
    params.push(`%${description.trim().toLowerCase()}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRow = await db.get<{ total: number }>(
    `
      SELECT COUNT(*) as total
      FROM module_routines
      ${whereSql}
    `,
    ...params,
  );

  const rows = await db.all(
    `
      SELECT id, code, description, observation, createdAt, updatedAt
      FROM module_routines
      ${whereSql}
      ORDER BY code ASC
      LIMIT ? OFFSET ?
    `,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  return {
    data: rows.map(mapModule),
    total: totalRow?.total ?? 0,
  };
}

export async function upsertModuleByCode(input: ModuleInput): Promise<ModuleRoutine> {
  const existing = await findModuleByCode(input.code);

  if (existing) {
    const updated = await updateModule(existing.id, input);
    if (updated) {
      return updated;
    }
  }

  return createModule(input);
}
