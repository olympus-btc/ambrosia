import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { logger } from '../utils/logger.js';
import { getPhoenixDataDirectory } from '../utils/resourcePaths.js';

const require = createRequire(import.meta.url);
const { safeStorage } = require('electron');

const HTTP_PASSWORD_FILENAME = '.http-password';
const HTTP_PASSWORD_LIMITED_ACCESS_FILENAME = '.http-password-limited-access';

function getHttpPasswordFilePath() {
  return path.join(getPhoenixDataDirectory(), HTTP_PASSWORD_FILENAME);
}

function getHttpPasswordLimitedAccessFilePath() {
  return path.join(getPhoenixDataDirectory(), HTTP_PASSWORD_LIMITED_ACCESS_FILENAME);
}

function saveEncrypted(filePath, plaintextCredential, logLabel) {
  const encryptedCredential = safeStorage.encryptString(plaintextCredential);
  fs.writeFileSync(filePath, encryptedCredential, { mode: 0o600 });
  logger.log(`[PhoenixdCredentialsStore] Saved encrypted ${logLabel}`);
}

function readEncrypted(filePath, logLabel) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const encryptedCredential = fs.readFileSync(filePath);
    return safeStorage.decryptString(encryptedCredential);
  } catch (decryptionError) {
    logger.error(`[PhoenixdCredentialsStore] Failed to read stored ${logLabel}:`, decryptionError);
    return null;
  }
}

function saveHttpPassword(httpPassword) {
  saveEncrypted(getHttpPasswordFilePath(), httpPassword, 'http-password');
}

function readHttpPassword() {
  return readEncrypted(getHttpPasswordFilePath(), 'http-password');
}

function saveHttpPasswordLimitedAccess(httpPasswordLimitedAccess) {
  saveEncrypted(getHttpPasswordLimitedAccessFilePath(), httpPasswordLimitedAccess, 'http-password-limited-access');
}

function readHttpPasswordLimitedAccess() {
  return readEncrypted(getHttpPasswordLimitedAccessFilePath(), 'http-password-limited-access');
}

export const phoenixdCredentialsStore = {
  saveHttpPassword,
  readHttpPassword,
  saveHttpPasswordLimitedAccess,
  readHttpPasswordLimitedAccess,
};
