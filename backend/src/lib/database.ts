import fs from 'node:fs';
import path from 'node:path';


type SqliteModule = typeof import('sqlite3');
type SqliteDatabase = import('sqlite').Database<any, any>;

import { runtimeEnv } from '../config/env';
import { prepareSqliteNativeBinding } from './sqlite-native';


let client: SqliteDatabase | null = null;
let createdOnInit = false;
let openFn: typeof import('sqlite').open | null = null;
let sqlite3Driver: SqliteModule | null = null;

const schemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL,
  mustChangePassword INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collaborator_profiles (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE,
  fullName TEXT NOT NULL,
  admissionDate DATETIME NOT NULL,
  activities TEXT,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS module_routines (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  observation TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_claims (
  id TEXT PRIMARY KEY,
  collaboratorId TEXT NOT NULL,
  moduleId TEXT NOT NULL,
  currentLevel TEXT NOT NULL,
  evidence TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboratorId) REFERENCES collaborator_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (moduleId) REFERENCES module_routines(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_claims_collaborator_module
  ON skill_claims(collaboratorId, moduleId);

CREATE TABLE IF NOT EXISTS manager_assessments (
  id TEXT PRIMARY KEY,
  collaboratorId TEXT NOT NULL,
  moduleId TEXT NOT NULL,
  targetLevel TEXT NOT NULL,
  comment TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboratorId) REFERENCES collaborator_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (moduleId) REFERENCES module_routines(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_assessments_collaborator_module
  ON manager_assessments(collaboratorId, moduleId);

CREATE TABLE IF NOT EXISTS career_plans (
  id TEXT PRIMARY KEY,
  collaboratorId TEXT NOT NULL,
  objectives TEXT NOT NULL,
  dueDate DATETIME,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaboratorId) REFERENCES collaborator_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS career_plan_modules (
  id TEXT PRIMARY KEY,
  careerPlanId TEXT NOT NULL,
  moduleId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (careerPlanId) REFERENCES career_plans(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (moduleId) REFERENCES module_routines(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_plan_modules_plan_module
  ON career_plan_modules(careerPlanId, moduleId);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT,
  payload TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
`;

const getSqliteDependencies = async () => {
  if (!openFn || !sqlite3Driver) {
    prepareSqliteNativeBinding();

    const [{ open }, sqlite3Module] = await Promise.all([
      import('sqlite'),
      import('sqlite3'),
    ]);

    openFn = open;
    sqlite3Driver = (sqlite3Module.default ?? sqlite3Module) as SqliteModule;
  }

  return {
    open: openFn!,
    sqlite3: sqlite3Driver!,
  };
};

export async function initializeDatabase(): Promise<SqliteDatabase> {
  if (client) {
    return client;
  }

  const databaseFile = runtimeEnv.databaseFile;
  const existedBefore = fs.existsSync(databaseFile);
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  const { open, sqlite3 } = await getSqliteDependencies();

  client = await open({
    filename: databaseFile,
    driver: sqlite3.Database as any,
  });

  await client.exec(schemaSql);

  createdOnInit = !existedBefore;

  return client;
}

export function wasDatabaseCreatedOnInit(): boolean {
  return createdOnInit;
}

export function getDatabase(): SqliteDatabase {
  if (!client) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() during application bootstrap.',
    );
  }

  return client;
}

export async function closeDatabase(): Promise<void> {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  createdOnInit = false;
}

export async function withTransaction<T>(
  handler: (db: SqliteDatabase) => Promise<T>,
): Promise<T> {
  const db = getDatabase();

  await db.exec('BEGIN IMMEDIATE TRANSACTION');

  try {
    const result = await handler(db);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
