const crypto = require('crypto');

let isPackaged = false;
let selectedStorageBackend = 'gnome_libsecret';
let encryptionAvailable = true;

const SAFE_STORAGE_MOCK_KEY = crypto.createHash('sha256').update('electron-mock-safe-storage-test-key').digest();

function encryptString(plainTextValue) {
  const initializationVector = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SAFE_STORAGE_MOCK_KEY, initializationVector);
  const encryptedValue = Buffer.concat([cipher.update(plainTextValue, 'utf-8'), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  return Buffer.concat([initializationVector, authenticationTag, encryptedValue]);
}

function decryptString(encryptedBuffer) {
  const initializationVector = encryptedBuffer.subarray(0, 12);
  const authenticationTag = encryptedBuffer.subarray(12, 28);
  const encryptedValue = encryptedBuffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', SAFE_STORAGE_MOCK_KEY, initializationVector);
  decipher.setAuthTag(authenticationTag);
  return Buffer.concat([decipher.update(encryptedValue), decipher.final()]).toString('utf-8');
}

const electronModuleExports = {
  app: {
    get isPackaged() {
      return isPackaged;
    },
  },
  safeStorage: {
    getSelectedStorageBackend: () => selectedStorageBackend,
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString,
    decryptString,
  },
};

function installElectronMock(additionalExports = {}) {
  Object.assign(electronModuleExports, additionalExports);
  const electronPath = require.resolve('electron');
  require.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: electronModuleExports,
  };
}

function setIsPackaged(newIsPackaged) {
  isPackaged = newIsPackaged;
}

function setSelectedStorageBackend(newSelectedStorageBackend) {
  selectedStorageBackend = newSelectedStorageBackend;
}

function setEncryptionAvailable(newEncryptionAvailable) {
  encryptionAvailable = newEncryptionAvailable;
}

function resetElectronMock() {
  isPackaged = false;
  selectedStorageBackend = 'gnome_libsecret';
  encryptionAvailable = true;
}

module.exports = {
  installElectronMock,
  setIsPackaged,
  setSelectedStorageBackend,
  setEncryptionAvailable,
  resetElectronMock,
};
