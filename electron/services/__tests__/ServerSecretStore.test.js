const fs = require('fs');
const os = require('os');
const path = require('path');

const { installElectronMock, resetElectronMock } = require('../../test-utils/electronMock.js');

let serverSecretStore;

beforeAll(() => {
  installElectronMock();
  ({ serverSecretStore } = require('../ServerSecretStore.js'));
});

const FAKE_HOME_DIRECTORY = '/fake/home';
const SERVER_SECRET_FILE_PATH = path.join(FAKE_HOME_DIRECTORY, '.Ambrosia-POS', '.server-secret');
const SERVER_SECRET = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

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

describe('save', () => {
  it('writes an encrypted file that does not contain the plain text secret', () => {
    serverSecretStore.save(SERVER_SECRET);

    const storedFileContent = fakeFiles.get(SERVER_SECRET_FILE_PATH);
    expect(storedFileContent).toBeInstanceOf(Buffer);
    expect(storedFileContent.toString('utf-8')).not.toContain(SERVER_SECRET);
  });

  it('writes the file with owner-only permissions', () => {
    serverSecretStore.save(SERVER_SECRET);

    expect(fs.writeFileSync).toHaveBeenCalledWith(SERVER_SECRET_FILE_PATH, expect.any(Buffer), { mode: 0o600 });
  });
});

describe('read', () => {
  it('returns null when no secret was ever saved', () => {
    expect(serverSecretStore.read()).toBe(null);
  });

  it('returns the original secret after a save/read round trip', () => {
    serverSecretStore.save(SERVER_SECRET);

    expect(serverSecretStore.read()).toBe(SERVER_SECRET);
  });

  it('returns null instead of throwing when the stored file is corrupted', () => {
    fakeFiles.set(SERVER_SECRET_FILE_PATH, Buffer.from('not a valid encrypted payload'));

    expect(serverSecretStore.read()).toBe(null);
  });
});
