import 'dotenv/config';

import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@hcm.local';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

const DEFAULT_MODULES = [
  {
    code: 'FOLHA_CALCULOS',
    description: 'Folha de Pagamento - Cálculos',
    observation: 'Folha de Pagamento',
  },
  {
    code: 'PONTO_CONTROLE',
    description: 'Controle de Ponto',
    observation: 'Jornada e Frequência',
  },
  {
    code: 'TREINAMENTO_GESTAO',
    description: 'Gestão de Treinamentos',
    observation: 'Desenvolvimento',
  },
];

async function seedAdmin() {
  const passwordHash = await hash(DEFAULT_ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: Role.MASTER,
    },
  });

  return admin;
}

async function seedModules() {
  await Promise.all(
    DEFAULT_MODULES.map((module) =>
      prisma.moduleRoutine.upsert({
        where: { code: module.code },
        update: {
          description: module.description,
          observation: module.observation,
        },
        create: module,
      }),
    ),
  );
}

async function main() {
  const admin = await seedAdmin();
  await seedModules();

  console.info('Seed concluído.');
  console.info(`Admin: ${admin.email} | senha: ${DEFAULT_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
