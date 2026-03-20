import { env } from '../../config/env.js';

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);

const serializeValue = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]),
    );
  }

  return value;
};

export const createLogger = (options = {}) => {
  const configuredLevel = options.level ?? env.logLevel;
  const minimumLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

  const log = (level, message, context = {}) => {
    if ((LOG_LEVELS[level] ?? LOG_LEVELS.info) < minimumLevel) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...serializeValue(context),
    };

    const serializedEntry = JSON.stringify(entry);

    if (level === 'error') {
      console.error(serializedEntry);
      return;
    }

    if (level === 'warn') {
      console.warn(serializedEntry);
      return;
    }

    console.log(serializedEntry);
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
  };
};

export const logger = createLogger();
