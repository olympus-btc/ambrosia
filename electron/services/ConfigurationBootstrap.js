const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const bip39 = require('bip39');

const { getDataDirectory, getPhoenixDataDirectory, getLogsDirectory } = require('../utils/resourcePaths');

/**
 * Generates a secure 12-word mnemonic using BIP39 standard.
 * - Uses industry-standard BIP39 wordlist (2,048 words)
 * - Provides 128 bits of entropy (132 bits with checksum)
 * - Includes built-in checksum for error detection
 * - Compatible with Bitcoin wallets and other crypto applications
 *
 * @returns {string} A 12-word mnemonic phrase
 */
function generateSecret() {
  const mnemonic = bip39.generateMnemonic(); // 12 words by default (128 bits)
  console.log('[ConfigurationBootstrap] Generated BIP39 mnemonic (132 bits entropy with checksum)');
  return mnemonic;
}

/**
 * Validates a BIP39 mnemonic phrase.
 * Checks both word validity and checksum integrity.
 *
 * @param {string} mnemonic - The mnemonic phrase to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateSecret(mnemonic) {
  return bip39.validateMnemonic(mnemonic);
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function generateRandomHex(length) {
  return crypto.randomBytes(length).toString('hex');
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[ConfigurationBootstrap] Created directory: ${dir}`);
  }
}

function configExists() {
  const dataDir = getDataDirectory();
  const phoenixDir = getPhoenixDataDirectory();
  const ambrosiaConfig = path.join(dataDir, 'ambrosia.conf');
  const phoenixConfig = path.join(phoenixDir, 'phoenix.conf');

  return fs.existsSync(ambrosiaConfig) && fs.existsSync(phoenixConfig);
}

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const config = {};

  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return config;
}

function writeConfig(configPath, config) {
  const lines = Object.entries(config).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(configPath, `${lines.join('\n')}\n`, 'utf-8');
  console.log(`[ConfigurationBootstrap] Written configuration to: ${configPath}`);
}

async function ensureConfigurations(ports) {
  const dataDir = getDataDirectory();
  const phoenixDir = getPhoenixDataDirectory();
  const logsDir = getLogsDirectory();

  ensureDirectoryExists(dataDir);
  ensureDirectoryExists(phoenixDir);
  ensureDirectoryExists(logsDir);

  const ambrosiaConfigPath = path.join(dataDir, 'ambrosia.conf');
  const phoenixConfigPath = path.join(phoenixDir, 'phoenix.conf');

  let ambrosiaConfig = readConfig(ambrosiaConfigPath);
  let phoenixConfig = readConfig(phoenixConfigPath);

  let needsUpdate = false;

  if (!fs.existsSync(ambrosiaConfigPath) || Object.keys(ambrosiaConfig).length === 0) {
    console.log('[ConfigurationBootstrap] Generating Ambrosia configuration...');
    const secret = generateSecret();
    const secretHash = hashSecret(secret);

    ambrosiaConfig = {
      'http-bind-ip': '127.0.0.1',
      'http-bind-port': ports.backend.toString(),
      secret,
      'secret-hash': secretHash,
      'phoenixd-url': `http://localhost:${ports.phoenixd}`,
    };

    writeConfig(ambrosiaConfigPath, ambrosiaConfig);
    needsUpdate = true;
  } else {
    ambrosiaConfig['http-bind-port'] = ports.backend.toString();
    ambrosiaConfig['phoenixd-url'] = `http://localhost:${ports.phoenixd}`;
  }

  if (!fs.existsSync(phoenixConfigPath) || Object.keys(phoenixConfig).length === 0) {
    console.log('[ConfigurationBootstrap] Generating Phoenix configuration...');
    const httpPassword = generateRandomHex(32);
    const httpPasswordLimited = generateRandomHex(32);
    const webhookSecret = generateRandomHex(32);

    phoenixConfig = {
      'http-password': httpPassword,
      'http-password-limited-access': httpPasswordLimited,
      'webhook-secret': webhookSecret,
      webhook: `http://127.0.0.1:${ports.backend}/webhook/phoenixd`,
      'auto-liquidity': 'off',
      'max-mining-fee-sat-vb': '5000',
    };

    writeConfig(phoenixConfigPath, phoenixConfig);
    needsUpdate = true;
  } else {
    phoenixConfig.webhook = `http://127.0.0.1:${ports.backend}/webhook/phoenixd`;
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

module.exports = {
  configExists,
  ensureConfigurations,
  readConfig,
  writeConfig,
  generateSecret,
  validateSecret,
  generateRandomHex,
};
