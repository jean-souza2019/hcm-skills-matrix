const {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
} = require('node:fs');
const { join, resolve } = require('node:path');
const pkg = require('pkg');

async function main() {
  const projectRoot = resolve(__dirname, '..');
  const distEntry = join(projectRoot, 'dist', 'main.js');
  const buildDir = join(projectRoot, 'build');
  const outputExe = join(buildDir, 'api.exe');
  const prismaClientDir = join(projectRoot, 'node_modules', '.prisma', 'client');
  const prismaOutputDir = join(buildDir, 'prisma');

  if (!existsSync(distEntry)) {
    throw new Error(`Build artifact not found: ${distEntry}`);
  }

  mkdirSync(buildDir, { recursive: true });

  await pkg.exec([
    distEntry,
    '--targets',
    'node18-win-x64',
    '--output',
    outputExe,
  ]);

  mkdirSync(prismaOutputDir, { recursive: true });
  copyPrismaAssets(prismaClientDir, prismaOutputDir);
}

function copyPrismaAssets(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    throw new Error(`Prisma client directory not found: ${sourceDir}`);
  }

  const entries = readdirSync(sourceDir);
  const candidates = new Set(['schema.prisma']);

  for (const entry of entries) {
    if (/^query_engine-.*\.node$/i.test(entry)) {
      candidates.add(entry);
      continue;
    }

    if (/^libquery_engine-.*\.(so|dylib|dll\.node)$/i.test(entry)) {
      candidates.add(entry);
      continue;
    }

    if (/\.wasm$/i.test(entry)) {
      candidates.add(entry);
    }
  }

  for (const file of candidates) {
    const from = join(sourceDir, file);

    if (!existsSync(from)) {
      continue;
    }

    const to = join(targetDir, file);
    cpSync(from, to);
  }
}

main().catch((error) => {
  console.error('pkg post-build failed', error);
  process.exit(1);
});
