/**
 * Structured logger for edge functions
 * Provides consistent JSON logging with configurable log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = (Deno.env.get('LOG_LEVEL') || 'info') as LogLevel;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL];
}

function formatLog(level: LogLevel, msg: string, data?: Record<string, unknown>): string {
  return JSON.stringify({
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('debug')) console.log(formatLog('debug', msg, data));
  },
  info: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('info')) console.log(formatLog('info', msg, data));
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('warn')) console.warn(formatLog('warn', msg, data));
  },
  error: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('error')) console.error(formatLog('error', msg, data));
  },
};
