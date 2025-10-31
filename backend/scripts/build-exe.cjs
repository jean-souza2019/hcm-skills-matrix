#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const buildDir = path.join(projectRoot, 'build');
const prismaDir = path.join(projectRoot, 'node_modules', '.prisma', 'client');
const prismaSchema = path.join(projectRoot, 'prisma', 'schema.prisma');
const seaBootstrap = path.join(projectRoot, 'scripts', 'sea-bootstrap.js');
const seaConfigPath = path.join(buildDir, 'sea-config.json');
const seaBlobPath = path.join(buildDir, 'sea-prep.blob');
const distOutputDir = path.join(buildDir, 'dist');
const nodeBinary = process.execPath;
const exeOutput = path.join(buildDir, 'api.exe');
const npxCommand = 'npx';
const postjectFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function ensureDistBuilt() {
  if (!fs.existsSync(path.join(distDir, 'main.js'))) {
    throw new Error('O bundle TypeScript não foi encontrado. Execute "yarn build" antes de gerar o executável.');
  }
}

function writeSeaConfig() {
  const config = {
    main: './scripts/sea-bootstrap.js',
    output: './build/sea-prep.blob',
    assets: ['./dist/**/*'],
  };
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(seaConfigPath, JSON.stringify(config, null, 2));
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Comando "${command} ${args.join(' ')}" finalizou com código ${result.status}`);
  }
}

function generateSeaBlob() {
  runCommand(nodeBinary, ['--experimental-sea-config', seaConfigPath]);
  if (!fs.existsSync(seaBlobPath)) {
    throw new Error('Blob SEA não foi gerado. Verifique o log acima para detalhes.');
  }
}

function injectSeaBlob() {
  fs.copyFileSync(nodeBinary, exeOutput);
  const postjectArgs = [
    'postject',
    exeOutput,
    'NODE_SEA_BLOB',
    seaBlobPath,
    '--sentinel-fuse',
    postjectFuse,
  ];
  if (process.platform === 'win32') {
    runCommand('cmd.exe', ['/c', npxCommand, ...postjectArgs]);
  } else {
    runCommand(npxCommand, postjectArgs);
  }
  fs.rmSync(seaBlobPath, { force: true });
  fs.rmSync(seaConfigPath, { force: true });
}

function copyRuntimeAssets() {
  copyPrismaAssets();
  copyDistOutput();
}

function copyPrismaAssets() {
  const prismaTarget = path.join(buildDir, '.prisma', 'client');
  const schemaTarget = path.join(buildDir, 'prisma', 'schema.prisma');

  if (!fs.existsSync(prismaDir)) {
    console.warn('Pasta ".prisma/client" não encontrada; ativos nativos do Prisma não foram copiados.');
  } else {
    copyDirectory(prismaDir, prismaTarget);
  }

  if (fs.existsSync(prismaSchema)) {
    copyFile(prismaSchema, schemaTarget);
  }
}

function copyDistOutput() {
  if (!fs.existsSync(distDir)) {
    console.warn('Pasta "dist" nǜo encontrada; arquivos compilados nǜo foram copiados.');
    return;
  }

  copyDirectory(distDir, distOutputDir);
}

function copyDirectory(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

async function run() {
  ensureDistBuilt();
  if (!fs.existsSync(seaBootstrap)) {
    throw new Error(`Arquivo de bootstrap não encontrado: ${seaBootstrap}`);
  }

  writeSeaConfig();
  generateSeaBlob();
  injectSeaBlob();
  copyRuntimeAssets();

  console.log(`Executável gerado em: ${exeOutput}`);
}

run().catch((error) => {
  console.error('Falha ao gerar executável com Node SEA:', error);
  process.exit(1);
});
