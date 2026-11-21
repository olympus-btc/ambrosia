import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { readConfigurationFile } from '../utils/configurationFile.js';
import { logger } from '../utils/logger.js';
import { pruneProcessLogFiles } from '../utils/processLogFiles.js';
import { getDataDirectory, getPhoenixDataDirectory, getLogsDirectory } from '../utils/resourcePaths.js';

import { phoenixdCredentialsStore } from './PhoenixdCredentialsStore.js';
import { serverSecretStore } from './ServerSecretStore.js';

function generateRandomHex(byteLength) {
  return crypto.randomBytes(byteLength).toString('hex');
}

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
    logger.log(`[ConfigurationBootstrap] Created directory: ${directoryPath}`);
  }
}

function configExists() {
  const dataDirectory = getDataDirectory();
  const phoenixDirectory = getPhoenixDataDirectory();
  const ambrosiaConfigPath = path.join(dataDirectory, 'ambrosia.conf');
  const phoenixConfigPath = path.join(phoenixDirectory, 'phoenix.conf');

  return fs.existsSync(ambrosiaConfigPath) && fs.existsSync(phoenixConfigPath);
}

function writeConfig(configPath, configEntries) {
  const configFileLines = Object.entries(configEntries).map(([configKey, configValue]) => `${configKey}=${configValue}`);
  fs.writeFileSync(configPath, `${configFileLines.join('\n')}\n`, { encoding: 'utf-8', mode: 0o600 });
  logger.log(`[ConfigurationBootstrap] Written configuration to: ${configPath}`);
}

function migrateOrGenerateSecret(readSecret, saveSecret, legacyPlaintextSecret, secretDescription) {
  if (readSecret()) {
    return;
  }

  if (legacyPlaintextSecret) {
    logger.log(`[ConfigurationBootstrap] Migrating the existing ${secretDescription} to encrypted storage...`);
    saveSecret(legacyPlaintextSecret);
  } else {
    logger.log(`[ConfigurationBootstrap] Generating encrypted ${secretDescription}...`);
    saveSecret(generateRandomHex(32));
  }
}

function syncRestoredServerSecret() {
  const ambrosiaConfigPath = path.join(getDataDirectory(), 'ambrosia.conf');
  const ambrosiaConfig = readConfigurationFile(ambrosiaConfigPath);

  if (!ambrosiaConfig.secret || ambrosiaConfig.secret === serverSecretStore.read()) {
    return false;
  }

  logger.log('[ConfigurationBootstrap] Syncing a restored server secret into encrypted storage...');
  serverSecretStore.save(ambrosiaConfig.secret);
  delete ambrosiaConfig.secret;
  delete ambrosiaConfig['secret-hash'];
  writeConfig(ambrosiaConfigPath, ambrosiaConfig);

  const keyStorePath = path.join(getDataDirectory(), 'keystore.jks');
  if (fs.existsSync(keyStorePath)) {
    logger.log('[ConfigurationBootstrap] Deleting the keystore so it regenerates with the synced secret...');
    fs.rmSync(keyStorePath, { force: true });
  }

  return true;
}

function syncRestoredPhoenixdCredentials() {
  const phoenixConfigPath = path.join(getPhoenixDataDirectory(), 'phoenix.conf');
  const phoenixConfig = readConfigurationFile(phoenixConfigPath);

  const httpPasswordDiffers = phoenixConfig['http-password']
    && phoenixConfig['http-password'] !== phoenixdCredentialsStore.readHttpPassword();
  const httpPasswordLimitedAccessDiffers = phoenixConfig['http-password-limited-access']
    && phoenixConfig['http-password-limited-access'] !== phoenixdCredentialsStore.readHttpPasswordLimitedAccess();

  if (!httpPasswordDiffers && !httpPasswordLimitedAccessDiffers) {
    return false;
  }

  logger.log('[ConfigurationBootstrap] Syncing restored phoenixd credentials into encrypted storage...');

  if (httpPasswordDiffers) {
    phoenixdCredentialsStore.saveHttpPassword(phoenixConfig['http-password']);
  }
  if (httpPasswordLimitedAccessDiffers) {
    phoenixdCredentialsStore.saveHttpPasswordLimitedAccess(phoenixConfig['http-password-limited-access']);
  }

  delete phoenixConfig['http-password'];
  delete phoenixConfig['http-password-limited-access'];
  writeConfig(phoenixConfigPath, phoenixConfig);

  return true;
}

async function ensureConfigurations(ports) {
  const dataDirectory = getDataDirectory();
  const phoenixDirectory = getPhoenixDataDirectory();
  const logsDirectory = getLogsDirectory();

  ensureDirectoryExists(dataDirectory);
  ensureDirectoryExists(phoenixDirectory);
  ensureDirectoryExists(logsDirectory);
  pruneProcessLogFiles();

  const ambrosiaConfigPath = path.join(dataDirectory, 'ambrosia.conf');
  const phoenixConfigPath = path.join(phoenixDirectory, 'phoenix.conf');

  let ambrosiaConfig = readConfigurationFile(ambrosiaConfigPath);
  let phoenixConfig = readConfigurationFile(phoenixConfigPath);

  let needsUpdate = false;

  if (!fs.existsSync(ambrosiaConfigPath) || Object.keys(ambrosiaConfig).length === 0) {
    logger.log('[ConfigurationBootstrap] Generating Ambrosia configuration...');

    ambrosiaConfig = {
      'http-bind-ip': '127.0.0.1',
      'http-bind-port': ports.backend.toString(),
      'phoenixd-url': `http://localhost:${ports.phoenixd}`,
    };

    writeConfig(ambrosiaConfigPath, ambrosiaConfig);
    needsUpdate = true;
  } else {
    ambrosiaConfig['http-bind-port'] = ports.backend.toString();

    const phoenixdRemoteConfigured = ambrosiaConfig['phoenixd-remote'] === 'true';
    if (!phoenixdRemoteConfigured) {
      ambrosiaConfig['phoenixd-url'] = `http://localhost:${ports.phoenixd}`;
    }
  }

  migrateOrGenerateSecret(serverSecretStore.read, serverSecretStore.save, ambrosiaConfig.secret, 'server secret');
  syncRestoredServerSecret();

  if ('secret' in ambrosiaConfig || 'secret-hash' in ambrosiaConfig) {
    delete ambrosiaConfig.secret;
    delete ambrosiaConfig['secret-hash'];
    needsUpdate = true;
  }

  if (!fs.existsSync(phoenixConfigPath) || Object.keys(phoenixConfig).length === 0) {
    logger.log('[ConfigurationBootstrap] Generating Phoenix configuration...');
    const webhookSecret = generateRandomHex(32);

    phoenixConfig = {
      'webhook-secret': webhookSecret,
      webhook: `http://127.0.0.1:${ports.backend}/webhook/phoenixd`,
      'auto-liquidity': 'off',
      'max-mining-fee': '5000',
    };

    writeConfig(phoenixConfigPath, phoenixConfig);
    needsUpdate = true;
  } else {
    phoenixConfig.webhook = `http://127.0.0.1:${ports.backend}/webhook/phoenixd`;
  }

  migrateOrGenerateSecret(
    phoenixdCredentialsStore.readHttpPassword,
    phoenixdCredentialsStore.saveHttpPassword,
    phoenixConfig['http-password'],
    'phoenixd http-password',
  );

  migrateOrGenerateSecret(
    phoenixdCredentialsStore.readHttpPasswordLimitedAccess,
    phoenixdCredentialsStore.saveHttpPasswordLimitedAccess,
    phoenixConfig['http-password-limited-access'],
    'phoenixd http-password-limited-access',
  );

  syncRestoredPhoenixdCredentials();

  if ('http-password' in phoenixConfig || 'http-password-limited-access' in phoenixConfig) {
    delete phoenixConfig['http-password'];
    delete phoenixConfig['http-password-limited-access'];
    needsUpdate = true;
  }

  if (needsUpdate || !fs.existsSync(ambrosiaConfigPath) || !fs.existsSync(phoenixConfigPath)) {
    writeConfig(ambrosiaConfigPath, ambrosiaConfig);
    writeConfig(phoenixConfigPath, phoenixConfig);
  }

  return {
    ambrosia: ambrosiaConfig,
    phoenix: phoenixConfig,
  };
}

export const configurationBootstrap = {
  configExists,
  ensureConfigurations,
  readConfig: readConfigurationFile,
  writeConfig,
  generateRandomHex,
  syncRestoredServerSecret,
  syncRestoredPhoenixdCredentials,
};
