import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { logger } from '../utils/logger.js';
import { getDataDirectory } from '../utils/resourcePaths.js';

const require = createRequire(import.meta.url);
const { safeStorage } = require('electron');

const UNLOCK_PASSWORD_FILENAME = '.unlock-key';

function getUnlockPasswordFilePath() {
  return path.join(getDataDirectory(), UNLOCK_PASSWORD_FILENAME);
}

function getStorageBackend() {
  if (process.platform === 'linux') {
    return safeStorage.getSelectedStorageBackend();
  }
  return safeStorage.isEncryptionAvailable() ? 'native' : 'basic_text';
}

function save(unlockPassword) {
  const encryptedUnlockPassword = safeStorage.encryptString(unlockPassword);
  fs.writeFileSync(getUnlockPasswordFilePath(), encryptedUnlockPassword, { mode: 0o600 });
  logger.log('[UnlockPasswordStore] Saved encrypted unlock password');
}

function read() {
  const unlockPasswordFilePath = getUnlockPasswordFilePath();
  if (!fs.existsSync(unlockPasswordFilePath)) {
    return null;
  }

  try {
    const encryptedUnlockPassword = fs.readFileSync(unlockPasswordFilePath);
    return safeStorage.decryptString(encryptedUnlockPassword);
  } catch (decryptionError) {
    logger.error('[UnlockPasswordStore] Failed to read stored unlock password:', decryptionError);
    return null;
  }
}

function clear() {
  const unlockPasswordFilePath = getUnlockPasswordFilePath();
  if (fs.existsSync(unlockPasswordFilePath)) {
    fs.unlinkSync(unlockPasswordFilePath);
    logger.log('[UnlockPasswordStore] Cleared stored unlock password');
  }
}

export const unlockPasswordStore = {
  getStorageBackend,
  save,
  read,
  clear,
};
