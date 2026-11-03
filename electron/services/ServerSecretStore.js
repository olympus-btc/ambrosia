import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { logger } from '../utils/logger.js';
import { getDataDirectory } from '../utils/resourcePaths.js';

const require = createRequire(import.meta.url);
const { safeStorage } = require('electron');

const SERVER_SECRET_FILENAME = '.server-secret';

function getServerSecretFilePath() {
  return path.join(getDataDirectory(), SERVER_SECRET_FILENAME);
}

function save(serverSecret) {
  const encryptedServerSecret = safeStorage.encryptString(serverSecret);
  fs.writeFileSync(getServerSecretFilePath(), encryptedServerSecret, { mode: 0o600 });
  logger.log('[ServerSecretStore] Saved encrypted server secret');
}

function read() {
  const serverSecretFilePath = getServerSecretFilePath();
  if (!fs.existsSync(serverSecretFilePath)) {
    return null;
  }

  try {
    const encryptedServerSecret = fs.readFileSync(serverSecretFilePath);
    return safeStorage.decryptString(encryptedServerSecret);
  } catch (decryptionError) {
    logger.error('[ServerSecretStore] Failed to read stored server secret:', decryptionError);
    return null;
  }
}

export const serverSecretStore = {
  save,
  read,
};
