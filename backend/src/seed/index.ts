import { hash } from 'bcryptjs';

import { Role } from '../domain/enums';
import { upsertModuleByCode } from '../repositories/modules.repository';
import { findUserByEmail, createUser } from '../repositories/users.repository';

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@hcm.local';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

const DEFAULT_MODULES = [
  {
    code: 'FOLHA_CALCULOS',
    description: 'Folha de Pagamento - Calculos',
    observation: 'Folha de Pagamento',
  },
  {
    code: 'PONTO_CONTROLE',
    description: 'Controle de Ponto',
    observation: 'Jornada e Frequencia',
  },
  {
    code: 'TREINAMENTO_GESTAO',
    description: 'Gestao de Treinamentos',
    observation: 'Desenvolvimento',
  },
];

async function seedAdmin() {
  const existing = await findUserByEmail(DEFAULT_ADMIN_EMAIL);

  if (existing) {
    return existing;
  }

  const passwordHash = await hash(DEFAULT_ADMIN_PASSWORD, 10);

  return createUser({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash,
    role: Role.MASTER,
    mustChangePassword: false,
  });
}

async function seedModules() {
  for (const module of DEFAULT_MODULES) {
    await upsertModuleByCode(module);
  }
}

export async function seedDefaultData() {
  const admin = await seedAdmin();
  await seedModules();

  return {
    adminEmail: admin.email,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
  };
}
