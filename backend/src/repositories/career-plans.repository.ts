import cuid from 'cuid';

import {
  CareerPlan,
  CareerPlanModule,
  CareerPlanModuleWithModule,
  CareerPlanWithModules,
  ModuleRoutine,
} from '../domain/entities';
import { getDatabase, withTransaction } from '../lib/database';
import { mapDate } from './mappers';

const mapCareerPlan = (row: any): CareerPlan => ({
  id: row.id,
  collaboratorId: row.collaboratorId,
  objectives: row.objectives,
  dueDate: row.dueDate ? mapDate(row.dueDate) : null,
  notes: row.notes ?? null,
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

const mapPlanModule = (row: any): CareerPlanModule => ({
  id: row.id,
  careerPlanId: row.careerPlanId,
  moduleId: row.moduleId,
  createdAt: mapDate(row.createdAt),
});

const mapModule = (row: any): ModuleRoutine => ({
  id: row.module_id,
  code: row.module_code,
  description: row.module_description,
  observation: row.module_observation ?? null,
  createdAt: mapDate(row.module_createdAt),
  updatedAt: mapDate(row.module_updatedAt),
});

const attachModules = (
  plan: CareerPlan,
  modules: CareerPlanModuleWithModule[],
): CareerPlanWithModules => ({
  ...plan,
  modules,
});

const fetchPlanModules = async (planId: string): Promise<CareerPlanModuleWithModule[]> => {
  const db = getDatabase();

  const rows = await db.all(
    `
      SELECT
        cpm.id,
        cpm.careerPlanId,
        cpm.moduleId,
        cpm.createdAt,
        m.id as module_id,
        m.code as module_code,
        m.description as module_description,
        m.observation as module_observation,
        m.createdAt as module_createdAt,
        m.updatedAt as module_updatedAt
      FROM career_plan_modules cpm
      JOIN module_routines m ON m.id = cpm.moduleId
      WHERE cpm.careerPlanId = ?
      ORDER BY m.code ASC
    `,
    planId,
  );

  return rows.map((row) => ({
    ...mapPlanModule(row),
    module: mapModule(row),
  }));
};

export interface CareerPlanInput {
  collaboratorId: string;
  objectives: string;
  dueDate?: string | null;
  notes?: string | null;
  moduleIds?: string[];
}

export async function createCareerPlan(
  input: CareerPlanInput,
): Promise<CareerPlanWithModules> {
  const id = cuid();

  await withTransaction(async (db) => {
    await db.run(
      `
        INSERT INTO career_plans
          (id, collaboratorId, objectives, dueDate, notes, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      id,
      input.collaboratorId,
      input.objectives,
      input.dueDate ?? null,
      input.notes ?? null,
    );

    const moduleIds = input.moduleIds ?? [];

    if (moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await db.run(
          `
            INSERT INTO career_plan_modules
              (id, careerPlanId, moduleId, createdAt)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `,
          cuid(),
          id,
          moduleId,
        );
      }
    }
  });

  const plan = await findCareerPlanById(id);

  if (!plan) {
    throw new Error('Failed to create career plan.');
  }

  return plan;
}

export interface UpdateCareerPlanInput {
  collaboratorId?: string;
  objectives?: string;
  dueDate?: string | null;
  notes?: string | null;
  moduleIds?: string[] | null;
}

export async function updateCareerPlan(
  id: string,
  input: UpdateCareerPlanInput,
): Promise<CareerPlanWithModules | null> {
  const scalarFields: string[] = [];
  const values: unknown[] = [];

  if (input.collaboratorId !== undefined) {
    scalarFields.push('collaboratorId = ?');
    values.push(input.collaboratorId);
  }

  if (input.objectives !== undefined) {
    scalarFields.push('objectives = ?');
    values.push(input.objectives);
  }

  if (input.dueDate !== undefined) {
    scalarFields.push('dueDate = ?');
    values.push(input.dueDate ?? null);
  }

  if (input.notes !== undefined) {
    scalarFields.push('notes = ?');
    values.push(input.notes ?? null);
  }

  const hasScalarUpdates = scalarFields.length > 0;
  const updateModules = Array.isArray(input.moduleIds);

  if (!hasScalarUpdates && !updateModules) {
    return findCareerPlanById(id);
  }

  await withTransaction(async (db) => {
    if (hasScalarUpdates) {
      values.push(id);
      await db.run(
        `
          UPDATE career_plans
          SET ${scalarFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        ...values,
      );
    }

    if (updateModules) {
      await db.run(`DELETE FROM career_plan_modules WHERE careerPlanId = ?`, id);

      const moduleIds = input.moduleIds ?? [];

      if (moduleIds.length > 0) {
        for (const moduleId of moduleIds) {
          await db.run(
            `
              INSERT INTO career_plan_modules
                (id, careerPlanId, moduleId, createdAt)
              VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `,
            cuid(),
            id,
            moduleId,
          );
        }
      }
    }
  });

  return findCareerPlanById(id);
}

export async function deleteCareerPlan(id: string): Promise<void> {
  await withTransaction(async (db) => {
    await db.run(`DELETE FROM career_plan_modules WHERE careerPlanId = ?`, id);
    await db.run(`DELETE FROM career_plans WHERE id = ?`, id);
  });
}

export async function findCareerPlanById(
  id: string,
): Promise<CareerPlanWithModules | null> {
  const db = getDatabase();

  const row = await db.get(
    `
      SELECT id, collaboratorId, objectives, dueDate, notes, createdAt, updatedAt
      FROM career_plans
      WHERE id = ?
    `,
    id,
  );

  if (!row) {
    return null;
  }

  const plan = mapCareerPlan(row);
  const modules = await fetchPlanModules(id);

  return attachModules(plan, modules);
}

export interface CareerPlanListParams {
  collaboratorId?: string;
}

export async function listCareerPlans(
  params: CareerPlanListParams = {},
): Promise<CareerPlanWithModules[]> {
  const db = getDatabase();

  const rows = await db.all(
    `
      SELECT id, collaboratorId, objectives, dueDate, notes, createdAt, updatedAt
      FROM career_plans
      ${params.collaboratorId ? 'WHERE collaboratorId = ?' : ''}
      ORDER BY createdAt DESC
    `,
    ...(params.collaboratorId ? [params.collaboratorId] : []),
  );

  const plans = rows.map(mapCareerPlan);

  const results: CareerPlanWithModules[] = [];

  for (const plan of plans) {
    const modules = await fetchPlanModules(plan.id);
    results.push(attachModules(plan, modules));
  }

  return results;
}
