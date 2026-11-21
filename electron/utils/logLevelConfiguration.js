import path from 'path';

import { readConfigurationFile } from './configurationFile.js';
import { getDataDirectory } from './dataDirectories.js';
import { setVerboseLogging } from './logger.js';

export const LOG_LEVEL_CONFIG_KEY = 'log-level';
export const SUPPORTED_LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
export const VERBOSE_LOG_LEVEL = 'DEBUG';

export function normalizeLogLevel(requestedLogLevel) {
  if (typeof requestedLogLevel !== 'string') return null;
  const upperCaseLogLevel = requestedLogLevel.trim().toUpperCase();
  return SUPPORTED_LOG_LEVELS.includes(upperCaseLogLevel) ? upperCaseLogLevel : null;
}

export function readConfiguredLogLevel() {
  try {
    const ambrosiaConfiguration = readConfigurationFile(path.join(getDataDirectory(), 'ambrosia.conf'));
    return normalizeLogLevel(ambrosiaConfiguration[LOG_LEVEL_CONFIG_KEY]);
  } catch {
    return null;
  }
}

export function applyLogLevel(requestedLogLevel) {
  const normalizedLogLevel = normalizeLogLevel(requestedLogLevel);
  if (!normalizedLogLevel) return false;
  setVerboseLogging(normalizedLogLevel === VERBOSE_LOG_LEVEL);
  return true;
}

export function applyConfiguredLogLevel() {
  const configuredLogLevel = readConfiguredLogLevel();
  if (configuredLogLevel) applyLogLevel(configuredLogLevel);
  return configuredLogLevel;
}
