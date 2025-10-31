import 'dotenv/config';

import { closeDatabase, initializeDatabase } from '../lib/database';
import { seedDefaultData } from '../seed';

async function main() {
  await initializeDatabase();

  const result = await seedDefaultData();

  console.info('Seed concluido.');
  console.info(`Admin: ${result.adminEmail} | senha: ${result.adminPassword}`);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
  });
