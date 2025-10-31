const path = require('path');
const fs = require('fs');
const util = require('util');
const { createRequire } = require('module');

const executableDir = path.dirname(process.execPath);
process.env.BUNDLE_RUNTIME = 'sea';
process.env.BUNDLE_EXECUTABLE_DIR = executableDir;

setupLogging();

const prismaEngine = path.join(
  executableDir,
  '.prisma',
  'client',
  'query_engine-windows.dll.node',
);
if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY && fs.existsSync(prismaEngine)) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = prismaEngine;
}

const schemaPath = path.join(executableDir, 'prisma', 'schema.prisma');
if (!process.env.PRISMA_SCHEMA_PATH && fs.existsSync(schemaPath)) {
  process.env.PRISMA_SCHEMA_PATH = schemaPath;
}

bootstrapApplication();

function bootstrapApplication() {
  const distEntry = path.join(executableDir, 'dist', 'main.js');

  if (!fs.existsSync(distEntry)) {
    const message = \Arquivo de entrada não encontrado: . Verifique se a pasta \"dist\" foi copiada junto ao executável.\;
    logDirect('FATAL', [message]);
    throw new Error(message);
  }

  try {
    const requireFromDist = createRequire(distEntry);
    requireFromDist(distEntry);
  } catch (error) {
    logDirect('FATAL', ['Falha ao iniciar aplicação:', error.stack ?? String(error)]);
    throw error;
  }
}

function logDirect(level, args) {
  try {
    const reporter = global.__seaLog;
    if (typeof reporter === 'function') {
      reporter(level, args);
    }
  } catch {
    // ignorar erros de log
  }
}

function setupLogging() {
  const logFilePath = path.join(executableDir, 'api.log');
  let loggingEnabled = true;

  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  const appendLog = (level, args) => {
    if (!loggingEnabled) {
      return;
    }

    const message = util.format(...args);
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;

    try {
      fs.appendFileSync(logFilePath, line, { encoding: 'utf8' });
    } catch (error) {
      loggingEnabled = false;
      originalConsole.error?.('Falha ao escrever no arquivo de log:', error);
    }
  };

  const wrapConsole = (method, level) => {
    const original = originalConsole[method] ?? originalConsole.log;
    console[method] = (...args) => {
      appendLog(level, args);
      original?.(...args);
    };
  };

  wrapConsole('log', 'INFO');
  wrapConsole('info', 'INFO');
  wrapConsole('warn', 'WARN');
  wrapConsole('error', 'ERROR');
  wrapConsole('debug', 'DEBUG');

  process.stdout.write = (chunk, encoding, callback) => {
    const text = Buffer.isBuffer(chunk) ? chunk.toString(encoding) : chunk;
    appendLog('STDOUT', [text.trimEnd()]);
    return originalStdoutWrite(chunk, encoding, callback);
  };

  process.stderr.write = (chunk, encoding, callback) => {
    const text = Buffer.isBuffer(chunk) ? chunk.toString(encoding) : chunk;
    appendLog('STDERR', [text.trimEnd()]);
    return originalStderrWrite(chunk, encoding, callback);
  };

  const recordFatal = (tag, error) => {
    const details =
      error instanceof Error ? error.stack ?? error.message : util.format(error);
    appendLog('FATAL', [tag, details]);
    originalConsole.error?.(`${tag}:`, error);
  };

  process.on('uncaughtException', (error) => {
    recordFatal('uncaughtException', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    recordFatal('unhandledRejection', reason);
    process.exit(1);
  });

  appendLog('INFO', ['SEA bootstrap inicializado. Logs em:', logFilePath]);

  global.__seaLog = (level, args) => appendLog(level, args);
}

