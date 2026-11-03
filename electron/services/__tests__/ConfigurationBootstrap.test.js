const fs = require('fs');
const os = require('os');
const path = require('path');

const { installElectronMock } = require('../../test-utils/electronMock.js');

let configurationBootstrap;
let serverSecretStore;
let phoenixdCredentialsStore;

beforeAll(() => {
  installElectronMock();
  ({ configurationBootstrap } = require('../ConfigurationBootstrap.js'));
  ({ serverSecretStore } = require('../ServerSecretStore.js'));
  ({ phoenixdCredentialsStore } = require('../PhoenixdCredentialsStore.js'));
  serverSecretStore.save = vi.fn();
  serverSecretStore.read = vi.fn();
  phoenixdCredentialsStore.saveHttpPassword = vi.fn();
  phoenixdCredentialsStore.readHttpPassword = vi.fn();
  phoenixdCredentialsStore.saveHttpPasswordLimitedAccess = vi.fn();
  phoenixdCredentialsStore.readHttpPasswordLimitedAccess = vi.fn();
});

const FAKE_HOME_DIRECTORY = '/fake/home';
const AMBROSIA_CONFIG_PATH = path.join(FAKE_HOME_DIRECTORY, '.Ambrosia-POS', 'ambrosia.conf');
const PHOENIX_CONFIG_PATH = path.join(FAKE_HOME_DIRECTORY, '.phoenix', 'phoenix.conf');

let fakeFiles;

function installFakeFileSystem() {
  fakeFiles = new Map();
  vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => fakeFiles.has(filePath));
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  vi.spyOn(fs, 'writeFileSync').mockImplementation((filePath, fileContent) => {
    fakeFiles.set(filePath, fileContent);
  });
  vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => fakeFiles.get(filePath));
}

beforeEach(() => {
  vi.spyOn(os, 'homedir').mockReturnValue(FAKE_HOME_DIRECTORY);
  installFakeFileSystem();
  serverSecretStore.save.mockReset();
  serverSecretStore.read.mockReset().mockReturnValue(null);
  phoenixdCredentialsStore.saveHttpPassword.mockReset();
  phoenixdCredentialsStore.readHttpPassword.mockReset().mockReturnValue(null);
  phoenixdCredentialsStore.saveHttpPasswordLimitedAccess.mockReset();
  phoenixdCredentialsStore.readHttpPasswordLimitedAccess.mockReset().mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateRandomHex', () => {
  it('returns a hex string with two characters per byte', () => {
    expect(configurationBootstrap.generateRandomHex(32)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different value on each call', () => {
    const firstHex = configurationBootstrap.generateRandomHex(32);
    const secondHex = configurationBootstrap.generateRandomHex(32);

    expect(firstHex).not.toBe(secondHex);
  });
});

describe('readConfig', () => {
  it('returns an empty object when the file does not exist', () => {
    expect(configurationBootstrap.readConfig('/does/not/exist.conf')).toEqual({});
  });

  it('parses key=value lines into an object', () => {
    fakeFiles.set('/config.conf', 'http-bind-ip=127.0.0.1\nhttp-bind-port=9154\n');

    expect(configurationBootstrap.readConfig('/config.conf')).toEqual({
      'http-bind-ip': '127.0.0.1',
      'http-bind-port': '9154',
    });
  });

  it('skips blank lines and comment lines', () => {
    fakeFiles.set('/config.conf', '# a comment\n\nhttp-bind-ip=127.0.0.1\n');

    expect(configurationBootstrap.readConfig('/config.conf')).toEqual({ 'http-bind-ip': '127.0.0.1' });
  });

  it('preserves "=" characters inside the value', () => {
    fakeFiles.set('/config.conf', 'webhook=http://localhost:9154/webhook?token=abc=def\n');

    expect(configurationBootstrap.readConfig('/config.conf')).toEqual({
      webhook: 'http://localhost:9154/webhook?token=abc=def',
    });
  });

  it('trims whitespace around keys and values', () => {
    fakeFiles.set('/config.conf', '  http-bind-ip = 127.0.0.1  \n');

    expect(configurationBootstrap.readConfig('/config.conf')).toEqual({ 'http-bind-ip': '127.0.0.1' });
  });
});

describe('writeConfig', () => {
  it('writes key=value lines with a trailing newline', () => {
    configurationBootstrap.writeConfig('/config.conf', { a: '1', b: '2' });

    expect(fakeFiles.get('/config.conf')).toBe('a=1\nb=2\n');
  });

  it('writes the file with owner-only permissions', () => {
    configurationBootstrap.writeConfig('/config.conf', { a: '1' });

    expect(fs.writeFileSync).toHaveBeenCalledWith('/config.conf', 'a=1\n', { encoding: 'utf-8', mode: 0o600 });
  });
});

describe('configExists', () => {
  it('returns false when neither config file exists', () => {
    expect(configurationBootstrap.configExists()).toBe(false);
  });

  it('returns false when only the ambrosia config exists', () => {
    fakeFiles.set(AMBROSIA_CONFIG_PATH, '');

    expect(configurationBootstrap.configExists()).toBe(false);
  });

  it('returns true when both config files exist', () => {
    fakeFiles.set(AMBROSIA_CONFIG_PATH, '');
    fakeFiles.set(PHOENIX_CONFIG_PATH, '');

    expect(configurationBootstrap.configExists()).toBe(true);
  });
});

describe('ensureConfigurations', () => {
  const allocatedPorts = { backend: 9154, phoenixd: 9740, nextjs: 3000 };

  it('creates the data, phoenix, and logs directories when they do not exist', async () => {
    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(FAKE_HOME_DIRECTORY, '.Ambrosia-POS'), { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(FAKE_HOME_DIRECTORY, '.phoenix'), { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(FAKE_HOME_DIRECTORY, '.Ambrosia-POS', 'logs'), { recursive: true });
  });

  it('generates a new ambrosia config without a secret or secret-hash field', async () => {
    const { ambrosia } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(ambrosia.secret).toBeUndefined();
    expect(ambrosia['secret-hash']).toBeUndefined();
    expect(ambrosia['http-bind-port']).toBe('9154');
    expect(ambrosia['phoenixd-url']).toBe('http://localhost:9740');
  });

  it('generates and saves an encrypted server secret when none exists yet', async () => {
    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(serverSecretStore.save).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it('does not regenerate the server secret when one already exists', async () => {
    serverSecretStore.read.mockReturnValue('existing-server-secret');

    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(serverSecretStore.save).not.toHaveBeenCalled();
  });

  it('migrates a legacy plaintext secret from an existing ambrosia.conf instead of generating a new one', async () => {
    fakeFiles.set(AMBROSIA_CONFIG_PATH, 'secret=legacy-plaintext-secret\nsecret-hash=legacy-hash\nhttp-bind-port=1111\n');
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'auto-liquidity=off\n');

    const { ambrosia } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(serverSecretStore.save).toHaveBeenCalledWith('legacy-plaintext-secret');
    expect(ambrosia.secret).toBeUndefined();
    expect(ambrosia['secret-hash']).toBeUndefined();
    expect(fakeFiles.get(AMBROSIA_CONFIG_PATH)).not.toContain('secret=');
    expect(fakeFiles.get(AMBROSIA_CONFIG_PATH)).not.toContain('secret-hash=');
  });

  it('strips a stale plaintext secret from ambrosia.conf even when the encrypted secret already exists', async () => {
    serverSecretStore.read.mockReturnValue('existing-server-secret');
    fakeFiles.set(AMBROSIA_CONFIG_PATH, 'secret=stale-plaintext-secret\nsecret-hash=stale-hash\nhttp-bind-port=1111\n');
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'auto-liquidity=off\n');

    const { ambrosia } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(serverSecretStore.save).not.toHaveBeenCalled();
    expect(ambrosia.secret).toBeUndefined();
    expect(ambrosia['secret-hash']).toBeUndefined();
    expect(fakeFiles.get(AMBROSIA_CONFIG_PATH)).not.toContain('secret=');
    expect(fakeFiles.get(AMBROSIA_CONFIG_PATH)).not.toContain('secret-hash=');
  });

  it('generates a new phoenix config without http-password fields', async () => {
    const { phoenix } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenix['webhook-secret']).toMatch(/^[0-9a-f]{64}$/);
    expect(phoenix.webhook).toBe('http://127.0.0.1:9154/webhook/phoenixd');
    expect(phoenix['http-password']).toBeUndefined();
    expect(phoenix['http-password-limited-access']).toBeUndefined();
  });

  it('generates and saves independent encrypted phoenixd http passwords when none exist yet', async () => {
    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenixdCredentialsStore.saveHttpPassword).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));
    expect(phoenixdCredentialsStore.saveHttpPasswordLimitedAccess).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/));

    const [savedHttpPassword] = phoenixdCredentialsStore.saveHttpPassword.mock.calls[0];
    const [savedHttpPasswordLimitedAccess] = phoenixdCredentialsStore.saveHttpPasswordLimitedAccess.mock.calls[0];
    expect(savedHttpPassword).not.toBe(savedHttpPasswordLimitedAccess);
  });

  it('does not regenerate the phoenixd http-password when one already exists', async () => {
    phoenixdCredentialsStore.readHttpPassword.mockReturnValue('existing-encrypted-password');

    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenixdCredentialsStore.saveHttpPassword).not.toHaveBeenCalled();
  });

  it('migrates a legacy plaintext http-password from an existing phoenix.conf instead of generating a new one', async () => {
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'http-password=legacy-plaintext-password\nauto-liquidity=off\n');

    const { phoenix } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenixdCredentialsStore.saveHttpPassword).toHaveBeenCalledWith('legacy-plaintext-password');
    expect(phoenix['http-password']).toBeUndefined();
    expect(fakeFiles.get(PHOENIX_CONFIG_PATH)).not.toContain('http-password=');
  });

  it('strips a stale plaintext http-password from phoenix.conf even when the encrypted password already exists', async () => {
    phoenixdCredentialsStore.readHttpPassword.mockReturnValue('existing-encrypted-password');
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'http-password=stale-plaintext-password\nauto-liquidity=off\n');

    const { phoenix } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenixdCredentialsStore.saveHttpPassword).not.toHaveBeenCalled();
    expect(phoenix['http-password']).toBeUndefined();
    expect(fakeFiles.get(PHOENIX_CONFIG_PATH)).not.toContain('http-password=');
  });

  it('migrates a legacy plaintext http-password-limited-access from an existing phoenix.conf instead of generating a new one', async () => {
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'http-password-limited-access=legacy-plaintext-password\nauto-liquidity=off\n');

    const { phoenix } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenixdCredentialsStore.saveHttpPasswordLimitedAccess).toHaveBeenCalledWith('legacy-plaintext-password');
    expect(phoenix['http-password-limited-access']).toBeUndefined();
    expect(fakeFiles.get(PHOENIX_CONFIG_PATH)).not.toContain('http-password-limited-access=');
  });

  it('updates http-bind-port when the ambrosia config already exists', async () => {
    fakeFiles.set(AMBROSIA_CONFIG_PATH, 'http-bind-port=1111\n');
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'auto-liquidity=off\n');

    const { ambrosia } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(ambrosia['http-bind-port']).toBe('9154');
  });

  it('does not overwrite phoenixd-url when a remote phoenixd node is already configured', async () => {
    fakeFiles.set(
      AMBROSIA_CONFIG_PATH,
      'phoenixd-remote=true\nphoenixd-url=http://100.1.1.1:9740\n',
    );
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'auto-liquidity=off\n');

    const { ambrosia } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(ambrosia['phoenixd-url']).toBe('http://100.1.1.1:9740');
  });

  it('does not regenerate the webhook secret when the phoenix config already exists', async () => {
    fakeFiles.set(AMBROSIA_CONFIG_PATH, 'http-bind-port=9154\n');
    fakeFiles.set(PHOENIX_CONFIG_PATH, 'webhook-secret=existing-webhook-secret\n');

    const { phoenix } = await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(phoenix['webhook-secret']).toBe('existing-webhook-secret');
    expect(phoenix.webhook).toBe('http://127.0.0.1:9154/webhook/phoenixd');
  });

  it('persists both config files to disk when a new config was generated', async () => {
    await configurationBootstrap.ensureConfigurations(allocatedPorts);

    expect(fakeFiles.has(AMBROSIA_CONFIG_PATH)).toBe(true);
    expect(fakeFiles.has(PHOENIX_CONFIG_PATH)).toBe(true);
  });
});
