import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspect } from 'node:util';

type NodeProcessWithPkg = NodeJS.Process & { pkg?: unknown };

const processWithPkg = process as NodeProcessWithPkg;
const preferSyncWrites = Boolean(processWithPkg.pkg);

interface InitializationError {
  dir: string;
  error: unknown;
}

interface InitializationResult {
  logDir?: string;
  logFile?: string;
  errors: InitializationError[];
}

const initialization = initializeLogDestination();
const LOG_DIR = initialization.logDir;
const LOG_FILE = initialization.logFile;
const logFileAvailable = Boolean(LOG_FILE);

if (!logFileAvailable) {
  for (const entry of initialization.errors) {
    reportInternalFailure(
      `Failed to initialize log destination at ${entry.dir}`,
      entry.error,
    );
  }
} else if (initialization.errors.length > 0 && LOG_FILE) {
  const details = initialization.errors
    .map((entry) => `${entry.dir}: ${serialize(entry.error)}`)
    .join('; ');

  process.stderr.write(
    `Logger using fallback destination at ${LOG_FILE}. Previous failures: ${details}\n`,
  );
}

function resolveLogDirCandidates(): string[] {
  const candidates = new Set<string>();
  const configuredDir = process.env.HCM_LOG_DIR ?? process.env.LOG_DIR;

  if (configuredDir) {
    candidates.add(path.resolve(configuredDir));
  }

  if (processWithPkg.pkg) {
    // When bundled with pkg, rely on the executable folder regardless of the shell CWD.
    candidates.add(path.join(path.dirname(process.execPath), 'logs'));
  } else {
    // Local dev falls back to the current working directory.
    candidates.add(path.resolve(process.cwd(), 'logs'));
  }

  const homeDir = safeDir(os.homedir());

  if (homeDir) {
    candidates.add(path.join(homeDir, 'hcm-skills-matrix', 'logs'));
  }

  candidates.add(path.join(os.tmpdir(), 'hcm-skills-matrix', 'logs'));

  return Array.from(candidates);
}

function initializeLogDestination(): InitializationResult {
  const errors: InitializationError[] = [];

  for (const candidate of resolveLogDirCandidates()) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      const file = path.join(candidate, 'app.log');
      fs.writeFileSync(file, '', { flag: 'a' });

      return {
        logDir: candidate,
        logFile: file,
        errors,
      };
    } catch (error) {
      errors.push({ dir: candidate, error });
    }
  }

  return {
    errors,
  };
}

function safeDir(directory: string | undefined): string | undefined {
  if (!directory || directory.trim().length === 0) {
    return undefined;
  }

  return directory;
}

function serialize(entry: unknown): string {
  if (entry instanceof Error) {
    return entry.stack ?? `${entry.name}: ${entry.message}`;
  }

  if (typeof entry === 'object') {
    return inspect(entry, { depth: null, breakLength: Infinity });
  }

  if (typeof entry === 'undefined') {
    return 'undefined';
  }

  return String(entry);
}

interface LogOptions {
  sync?: boolean;
}

function appendLine(
  level: string,
  message: unknown,
  meta?: unknown,
  options: LogOptions = {},
) {
  const timestamp = new Date().toISOString();
  const parts = [timestamp, level, serialize(message)];

  if (typeof meta !== 'undefined') {
    parts.push(serialize(meta));
  }

  const line = `${parts.join(' | ')}\n`;

  if (!LOG_FILE) {
    process.stderr.write(line);
    return;
  }

  try {
    if (options.sync ?? preferSyncWrites) {
      fs.appendFileSync(LOG_FILE, line);
      return;
    }

    void fs.promises.appendFile(LOG_FILE, line);
  } catch (error) {
    reportInternalFailure('Failed to write log entry', error);
  }
}

function log(
  level: string,
  message: unknown,
  meta?: unknown,
  options?: LogOptions,
) {
  appendLine(level, message, meta, options);
}

function reportInternalFailure(context: string, error: unknown) {
  const fallback = serialize(error);
  process.stderr.write(`${context}: ${fallback}\n`);
}

export const logger = {
  info(message: unknown, meta?: unknown) {
    log('INFO', message, meta);
  },
  warn(message: unknown, meta?: unknown) {
    log('WARN', message, meta);
  },
  error(message: unknown, meta?: unknown) {
    log('ERROR', message, meta);
  },
  debug(message: unknown, meta?: unknown) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    log('DEBUG', message, meta);
  },
};

export const httpLogStream = {
  write(message: string) {
    log('HTTP', message.trim());
  },
};

export const logDestination = {
  directory: LOG_DIR ?? null,
  file: LOG_FILE ?? null,
  fallback: initialization.errors.length > 0,
  active: logFileAvailable,
};

export function logUnhandledError(origin: string, error: unknown) {
  const context = typeof origin === 'string' ? origin : 'unknown';
  const payload =
    error instanceof Error
      ? error
      : { detail: serialize(error) };

  log('ERROR', `Unhandled error from ${context}`, payload, { sync: true });
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

const originalConsole: Record<ConsoleMethod, (...args: unknown[]) => void> = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

const globalWithCapture = globalThis as typeof globalThis & {
  __hcmConsoleCaptured__?: boolean;
};

if (
  process.env.HCM_CAPTURE_CONSOLE !== 'false' &&
  !globalWithCapture.__hcmConsoleCaptured__
) {
  captureConsole();
  globalWithCapture.__hcmConsoleCaptured__ = true;
}

function captureConsole() {
  const mapping: Record<ConsoleMethod, keyof typeof logger> = {
    log: 'info',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
  };

  for (const method of Object.keys(mapping) as ConsoleMethod[]) {
    const level = mapping[method];

    console[method] = (...args: unknown[]) => {
      originalConsole[method](...args);

      if (args.length === 0) {
        logger[level]('');
        return;
      }

      const [first, ...rest] = args;
      const meta =
        rest.length === 0 ? undefined : rest.length === 1 ? rest[0] : rest;

      logger[level](first, meta);
    };
  }
}
