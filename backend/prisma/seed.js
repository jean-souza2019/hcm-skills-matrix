"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
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
    const passwordHash = await (0, bcryptjs_1.hash)(DEFAULT_ADMIN_PASSWORD, 10);
    const admin = await prisma.user.upsert({
        where: { email: DEFAULT_ADMIN_EMAIL },
        update: {},
        create: {
            email: DEFAULT_ADMIN_EMAIL,
            passwordHash,
            role: client_1.Role.MASTER,
        },
    });
    return admin;
}
async function seedModules() {
    await Promise.all(DEFAULT_MODULES.map((module) => prisma.moduleRoutine.upsert({
        where: { code: module.code },
        update: {
            description: module.description,
            observation: module.observation,
        },
        create: module,
    })));
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
