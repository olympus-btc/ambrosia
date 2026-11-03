const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  installElectronMock,
  setSelectedStorageBackend,
  setEncryptionAvailable,
  resetElectronMock,
} = require('../../test-utils/electronMock.js');
const { setPlatformAndArch, restorePlatformAndArch } = require('../../test-utils/platformMock.js');

let unlockPasswordStore;

beforeAll(() => {
  installElectronMock();
  ({ unlockPasswordStore } = require('../UnlockPasswordStore.js'));
});

const FAKE_HOME_DIRECTORY = '/fake/home';
const UNLOCK_PASSWORD_FILE_PATH = path.join(FAKE_HOME_DIRECTORY, '.Ambrosia-POS', '.unlock-key');
const UNLOCK_PASSWORD = 'correct horse battery staple';

let fakeFiles;

function installFakeFileSystem() {
  fakeFiles = new Map();
  vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => fakeFiles.has(filePath));
  vi.spyOn(fs, 'writeFileSync').mockImplementation((filePath, fileContent) => {
    fakeFiles.set(filePath, fileContent);
  });
  vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => fakeFiles.get(filePath));
  vi.spyOn(fs, 'unlinkSync').mockImplementation((filePath) => {
    fakeFiles.delete(filePath);
  });
}

beforeEach(() => {
  vi.spyOn(os, 'homedir').mockReturnValue(FAKE_HOME_DIRECTORY);
  installFakeFileSystem();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetElectronMock();
  restorePlatformAndArch();
});

describe('getStorageBackend', () => {
  it('returns the backend reported by safeStorage on Linux', () => {
    setPlatformAndArch('linux', 'x64');
    setSelectedStorageBackend('kwallet');

    expect(unlockPasswordStore.getStorageBackend()).toBe('kwallet');
  });

  it('returns basic_text on Linux when no keyring is available', () => {
    setPlatformAndArch('linux', 'x64');
    setSelectedStorageBackend('basic_text');

    expect(unlockPasswordStore.getStorageBackend()).toBe('basic_text');
  });

  it('returns native on macOS/Windows when encryption is available', () => {
    setPlatformAndArch('darwin', 'arm64');
    setEncryptionAvailable(true);

    expect(unlockPasswordStore.getStorageBackend()).toBe('native');
  });

  it('returns basic_text on macOS/Windows when encryption is not available', () => {
    setPlatformAndArch('darwin', 'arm64');
    setEncryptionAvailable(false);

    expect(unlockPasswordStore.getStorageBackend()).toBe('basic_text');
  });
});

describe('save', () => {
  it('writes an encrypted file that does not contain the plain text password', () => {
    unlockPasswordStore.save(UNLOCK_PASSWORD);

    const storedFileContent = fakeFiles.get(UNLOCK_PASSWORD_FILE_PATH);
    expect(storedFileContent).toBeInstanceOf(Buffer);
    expect(storedFileContent.toString('utf-8')).not.toContain(UNLOCK_PASSWORD);
  });

  it('writes the file with owner-only permissions', () => {
    unlockPasswordStore.save(UNLOCK_PASSWORD);

    expect(fs.writeFileSync).toHaveBeenCalledWith(UNLOCK_PASSWORD_FILE_PATH, expect.any(Buffer), { mode: 0o600 });
  });
});

describe('read', () => {
  it('returns null when no password was ever saved', () => {
    expect(unlockPasswordStore.read()).toBe(null);
  });

  it('returns the original password after a save/read round trip', () => {
    unlockPasswordStore.save(UNLOCK_PASSWORD);

    expect(unlockPasswordStore.read()).toBe(UNLOCK_PASSWORD);
  });

  it('returns null instead of throwing when the stored file is corrupted', () => {
    fakeFiles.set(UNLOCK_PASSWORD_FILE_PATH, Buffer.from('not a valid encrypted payload'));

    expect(unlockPasswordStore.read()).toBe(null);
  });
});

describe('clear', () => {
  it('removes a previously saved password file', () => {
    unlockPasswordStore.save(UNLOCK_PASSWORD);

    unlockPasswordStore.clear();

    expect(fakeFiles.has(UNLOCK_PASSWORD_FILE_PATH)).toBe(false);
  });

  it('does nothing when no password file exists', () => {
    unlockPasswordStore.clear();

    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
