const fs = require('fs');
const os = require('os');
const path = require('path');

const { installElectronMock, resetElectronMock } = require('../../test-utils/electronMock.js');

let phoenixdCredentialsStore;

beforeAll(() => {
  installElectronMock();
  ({ phoenixdCredentialsStore } = require('../PhoenixdCredentialsStore.js'));
});

const FAKE_HOME_DIRECTORY = '/fake/home';
const HTTP_PASSWORD_FILE_PATH = path.join(FAKE_HOME_DIRECTORY, '.phoenix', '.http-password');
const HTTP_PASSWORD_LIMITED_ACCESS_FILE_PATH = path.join(FAKE_HOME_DIRECTORY, '.phoenix', '.http-password-limited-access');
const HTTP_PASSWORD = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
const HTTP_PASSWORD_LIMITED_ACCESS = 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3';

let fakeFiles;

function installFakeFileSystem() {
  fakeFiles = new Map();
  vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => fakeFiles.has(filePath));
  vi.spyOn(fs, 'writeFileSync').mockImplementation((filePath, fileContent) => {
    fakeFiles.set(filePath, fileContent);
  });
  vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => fakeFiles.get(filePath));
}

beforeEach(() => {
  vi.spyOn(os, 'homedir').mockReturnValue(FAKE_HOME_DIRECTORY);
  installFakeFileSystem();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetElectronMock();
});

describe('saveHttpPassword', () => {
  it('writes an encrypted file that does not contain the plain text password', () => {
    phoenixdCredentialsStore.saveHttpPassword(HTTP_PASSWORD);

    const storedFileContent = fakeFiles.get(HTTP_PASSWORD_FILE_PATH);
    expect(storedFileContent).toBeInstanceOf(Buffer);
    expect(storedFileContent.toString('utf-8')).not.toContain(HTTP_PASSWORD);
  });

  it('writes the file with owner-only permissions', () => {
    phoenixdCredentialsStore.saveHttpPassword(HTTP_PASSWORD);

    expect(fs.writeFileSync).toHaveBeenCalledWith(HTTP_PASSWORD_FILE_PATH, expect.any(Buffer), { mode: 0o600 });
  });
});

describe('readHttpPassword', () => {
  it('returns null when no password was ever saved', () => {
    expect(phoenixdCredentialsStore.readHttpPassword()).toBe(null);
  });

  it('returns the original password after a save/read round trip', () => {
    phoenixdCredentialsStore.saveHttpPassword(HTTP_PASSWORD);

    expect(phoenixdCredentialsStore.readHttpPassword()).toBe(HTTP_PASSWORD);
  });

  it('returns null instead of throwing when the stored file is corrupted', () => {
    fakeFiles.set(HTTP_PASSWORD_FILE_PATH, Buffer.from('not a valid encrypted payload'));

    expect(phoenixdCredentialsStore.readHttpPassword()).toBe(null);
  });
});

describe('saveHttpPasswordLimitedAccess', () => {
  it('writes an encrypted file that does not contain the plain text password', () => {
    phoenixdCredentialsStore.saveHttpPasswordLimitedAccess(HTTP_PASSWORD_LIMITED_ACCESS);

    const storedFileContent = fakeFiles.get(HTTP_PASSWORD_LIMITED_ACCESS_FILE_PATH);
    expect(storedFileContent).toBeInstanceOf(Buffer);
    expect(storedFileContent.toString('utf-8')).not.toContain(HTTP_PASSWORD_LIMITED_ACCESS);
  });

  it('writes the file with owner-only permissions', () => {
    phoenixdCredentialsStore.saveHttpPasswordLimitedAccess(HTTP_PASSWORD_LIMITED_ACCESS);

    expect(fs.writeFileSync).toHaveBeenCalledWith(HTTP_PASSWORD_LIMITED_ACCESS_FILE_PATH, expect.any(Buffer), { mode: 0o600 });
  });
});

describe('readHttpPasswordLimitedAccess', () => {
  it('returns null when no password was ever saved', () => {
    expect(phoenixdCredentialsStore.readHttpPasswordLimitedAccess()).toBe(null);
  });

  it('returns the original password after a save/read round trip', () => {
    phoenixdCredentialsStore.saveHttpPasswordLimitedAccess(HTTP_PASSWORD_LIMITED_ACCESS);

    expect(phoenixdCredentialsStore.readHttpPasswordLimitedAccess()).toBe(HTTP_PASSWORD_LIMITED_ACCESS);
  });

  it('returns null instead of throwing when the stored file is corrupted', () => {
    fakeFiles.set(HTTP_PASSWORD_LIMITED_ACCESS_FILE_PATH, Buffer.from('not a valid encrypted payload'));

    expect(phoenixdCredentialsStore.readHttpPasswordLimitedAccess()).toBe(null);
  });
});

describe('independence between the two credentials', () => {
  it('does not let saving one password affect the other', () => {
    phoenixdCredentialsStore.saveHttpPassword(HTTP_PASSWORD);

    expect(phoenixdCredentialsStore.readHttpPasswordLimitedAccess()).toBe(null);
  });
});
