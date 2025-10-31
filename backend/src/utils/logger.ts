import fs from 'fs';
import path from 'path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const LOG_FILE_NAME = 'backend.log';

const isRunningFromPkg = typeof (process as NodeJS.Process & { pkg?: unknown }).pkg !== 'undefined';

function resolveLogDirectory(): string {
  if (isRunningFromPkg) {
    return process.cwd();
  }

  return path.resolve(__dirname, '..', '..');
}

const logFilePath = path.join(resolveLogDirectory(), LOG_FILE_NAME);

let isInitialized = false;
let handlersAttached = false;

function ensureLogFile() {
  const logDir = path.dirname(logFilePath);

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', { encoding: 'utf8' });
    }
  } catch (error) {
    console.error('Failed to prepare log file:', error);
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return String(error);
  }
}

function writeLog(level: LogLevel, message: string, errorDetails?: unknown) {
  const timestamp = new Date().toISOString();
  const baseLine = `[${timestamp}] [${level}] ${message}`;
  const errorBlock =
    errorDetails !== undefined
      ? `\n${formatError(errorDetails)
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n')}`
      : '';

  const entry = `${baseLine}${errorBlock}\n`;

  ensureLogFile();

  try {
    fs.appendFileSync(logFilePath, entry, { encoding: 'utf8' });
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }

  const consoleMethod =
    level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;

  consoleMethod(entry.trimEnd());
}

export function initializeLogger() {
  if (!isInitialized) {
    ensureLogFile();
    isInitialized = true;
  }

  if (!handlersAttached) {
    handlersAttached = true;

    process.on('uncaughtException', (error) => {
      logError('Uncaught exception', error);
    });

    process.on('unhandledRejection', (reason) => {
      logError('Unhandled promise rejection', reason);
    });

    process.on('SIGINT', () => {
      logInfo('Received SIGINT. Shutting down gracefully.');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logInfo('Received SIGTERM. Shutting down gracefully.');
      process.exit(0);
    });
  }
}

export function logInfo(message: string) {
  writeLog('INFO', message);
}

export function logWarn(message: string) {
  writeLog('WARN', message);
}

export function logError(message: string, error?: unknown) {
  writeLog('ERROR', message, error);
}

export function getLogFilePath(): string {
  return logFilePath;
}

export const httpLoggerStream = {
  write(message: string) {
    logInfo(message.trim());
  },
};
