import cuid from 'cuid';

import { Role } from '../domain/enums';
import { User } from '../domain/entities';
import { getDatabase } from '../lib/database';
import { mapDate, parseBoolean } from './mappers';

export interface CreateUserInput {
  id?: string;
  email: string;
  passwordHash: string;
  role: Role;
  mustChangePassword?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  role?: Role;
  mustChangePassword?: boolean;
}

const mapUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  role: row.role as Role,
  mustChangePassword: parseBoolean(row.mustChangePassword),
  createdAt: mapDate(row.createdAt),
  updatedAt: mapDate(row.updatedAt),
});

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDatabase();
  const row = await db.get(
    `
    SELECT id, email, passwordHash, role, mustChangePassword, createdAt, updatedAt
    FROM users
    WHERE email = ?
  `,
    email.trim().toLowerCase(),
  );
  return row ? mapUser(row) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDatabase();
  const row = await db.get(
    `
    SELECT id, email, passwordHash, role, mustChangePassword, createdAt, updatedAt
    FROM users
    WHERE id = ?
  `,
    id,
  );
  return row ? mapUser(row) : null;
}

export async function findUserSummaryById(
  id: string,
): Promise<Pick<User, 'id' | 'email' | 'role' | 'mustChangePassword' | 'createdAt'> | null> {
  const db = getDatabase();
  const row = await db.get(
    `
    SELECT id, email, role, mustChangePassword, createdAt
    FROM users
    WHERE id = ?
  `,
    id,
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role as Role,
    mustChangePassword: parseBoolean(row.mustChangePassword),
    createdAt: mapDate(row.createdAt),
  };
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const db = getDatabase();
  const id = input.id ?? cuid();

  await db.run(
    `
    INSERT INTO users (id, email, passwordHash, role, mustChangePassword, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,
    id,
    input.email.trim().toLowerCase(),
    input.passwordHash,
    input.role,
    input.mustChangePassword ? 1 : 0,
  );

  const user = await findUserById(id);

  if (!user) {
    throw new Error('Failed to create user.');
  }

  return user;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<User | null> {
  const db = getDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.email !== undefined) {
    fields.push('email = ?');
    values.push(input.email.trim().toLowerCase());
  }

  if (input.passwordHash !== undefined) {
    fields.push('passwordHash = ?');
    values.push(input.passwordHash);
  }

  if (input.role !== undefined) {
    fields.push('role = ?');
    values.push(input.role);
  }

  if (input.mustChangePassword !== undefined) {
    fields.push('mustChangePassword = ?');
    values.push(input.mustChangePassword ? 1 : 0);
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  values.push(id);

  await db.run(
    `
    UPDATE users
    SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    ...values,
  );

  return findUserById(id);
}

export async function deleteUserById(id: string): Promise<void> {
  const db = getDatabase();
  await db.run(
    `
    DELETE FROM users
    WHERE id = ?
  `,
    id,
  );
}
