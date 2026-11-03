const fs = require('fs');
const os = require('os');
const path = require('path');

const { installElectronMock, setIsPackaged, resetElectronMock } = require('../../test-utils/electronMock.js');
const { setPlatformAndArch, restorePlatformAndArch } = require('../../test-utils/platformMock.js');

let resourcePaths;

beforeAll(() => {
  installElectronMock();
  resourcePaths = require('../resourcePaths.js');
});

beforeEach(() => {
  resetElectronMock();
  delete process.env.NODE_ENV;
  delete process.resourcesPath;
});

afterEach(() => {
  restorePlatformAndArch();
  vi.restoreAllMocks();
});

describe('getPlatform', () => {
  it('returns macos-arm64 for darwin on arm64', () => {
    setPlatformAndArch('darwin', 'arm64');
    expect(resourcePaths.getPlatform()).toBe('macos-arm64');
  });

  it('returns macos-x64 for darwin on x64', () => {
    setPlatformAndArch('darwin', 'x64');
    expect(resourcePaths.getPlatform()).toBe('macos-x64');
  });

  it('returns win-arm64 for win32 on arm64', () => {
    setPlatformAndArch('win32', 'arm64');
    expect(resourcePaths.getPlatform()).toBe('win-arm64');
  });

  it('returns win-x64 for win32 on x64', () => {
    setPlatformAndArch('win32', 'x64');
    expect(resourcePaths.getPlatform()).toBe('win-x64');
  });

  it('returns linux-arm64 for linux on arm64', () => {
    setPlatformAndArch('linux', 'arm64');
    expect(resourcePaths.getPlatform()).toBe('linux-arm64');
  });

  it('returns linux-x64 for linux on x64', () => {
    setPlatformAndArch('linux', 'x64');
    expect(resourcePaths.getPlatform()).toBe('linux-x64');
  });

  it('throws for an unsupported platform', () => {
    setPlatformAndArch('freebsd', 'x64');
    expect(() => resourcePaths.getPlatform()).toThrow('Unsupported platform: freebsd');
  });
});

describe('isDevelopment', () => {
  it('returns true when NODE_ENV=development, even if app.isPackaged is true', () => {
    process.env.NODE_ENV = 'development';
    setIsPackaged(true);

    expect(resourcePaths.isDevelopment()).toBe(true);
  });

  it('returns true when app.isPackaged is false and NODE_ENV is unset', () => {
    setIsPackaged(false);

    expect(resourcePaths.isDevelopment()).toBe(true);
  });

  it('returns false when app.isPackaged is true and NODE_ENV is unset', () => {
    setIsPackaged(true);

    expect(resourcePaths.isDevelopment()).toBe(false);
  });
});

describe('getBasePath', () => {
  it('returns the electron directory in development', () => {
    setIsPackaged(false);

    expect(resourcePaths.getBasePath()).toBe(path.join(__dirname, '..', '..'));
  });

  it('returns process.resourcesPath in production', () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';

    expect(resourcePaths.getBasePath()).toBe('/fake/resources');
  });
});

describe('getDataDirectory', () => {
  it('joins the home directory with .Ambrosia-POS', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/fake/home');

    expect(resourcePaths.getDataDirectory()).toBe(path.join('/fake/home', '.Ambrosia-POS'));
  });
});

describe('getPhoenixDataDirectory', () => {
  it('joins the home directory with .phoenix', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/fake/home');

    expect(resourcePaths.getPhoenixDataDirectory()).toBe(path.join('/fake/home', '.phoenix'));
  });
});

describe('getLogsDirectory', () => {
  it('joins the data directory with logs', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/fake/home');

    expect(resourcePaths.getLogsDirectory()).toBe(path.join('/fake/home', '.Ambrosia-POS', 'logs'));
  });
});

describe('getJavaPath', () => {
  it('returns the bare java command in development', () => {
    setIsPackaged(false);

    expect(resourcePaths.getJavaPath()).toBe('java');
  });

  it('returns the bundled JRE path in production when it exists', () => {
    setIsPackaged(true);
    setPlatformAndArch('darwin', 'arm64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const expectedJavaPath = path.join('/fake/resources', 'jre', 'macos-arm64', 'bin', 'java');
    expect(resourcePaths.getJavaPath()).toBe(expectedJavaPath);
  });

  it('uses java.exe on Windows in production', () => {
    setIsPackaged(true);
    setPlatformAndArch('win32', 'x64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const expectedJavaPath = path.join('/fake/resources', 'jre', 'win-x64', 'bin', 'java.exe');
    expect(resourcePaths.getJavaPath()).toBe(expectedJavaPath);
  });

  it('throws when the bundled JRE is missing in production', () => {
    setIsPackaged(true);
    setPlatformAndArch('darwin', 'arm64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => resourcePaths.getJavaPath()).toThrow('Required resource not found — Java runtime');
  });
});

describe('getPhoenixdPath', () => {
  it('returns the bare phoenixd command in development', () => {
    setIsPackaged(false);

    expect(resourcePaths.getPhoenixdPath()).toBe('phoenixd');
  });

  it('returns the bundled binary path in production on macOS', () => {
    setIsPackaged(true);
    setPlatformAndArch('darwin', 'x64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const expectedPhoenixdPath = path.join('/fake/resources', 'phoenixd', 'macos-x64', 'phoenixd');
    expect(resourcePaths.getPhoenixdPath()).toBe(expectedPhoenixdPath);
  });

  it('returns the bat wrapper path in production on Windows', () => {
    setIsPackaged(true);
    setPlatformAndArch('win32', 'x64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const expectedPhoenixdPath = path.join('/fake/resources', 'phoenixd', 'win-x64', 'bin', 'phoenixd.bat');
    expect(resourcePaths.getPhoenixdPath()).toBe(expectedPhoenixdPath);
  });

  it('throws when the bundled binary is missing in production', () => {
    setIsPackaged(true);
    setPlatformAndArch('linux', 'x64');
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => resourcePaths.getPhoenixdPath()).toThrow('Required resource not found — Phoenixd binary');
  });
});

describe('getClientPath', () => {
  it('returns the client directory in development', () => {
    setIsPackaged(false);

    expect(resourcePaths.getClientPath()).toBe(path.join(__dirname, '..', '..', '..', 'client'));
  });

  it('returns the bundled client path in production when it exists', () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    expect(resourcePaths.getClientPath()).toBe(path.join('/fake/resources', 'client'));
  });

  it('throws when the bundled client is missing in production', () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => resourcePaths.getClientPath()).toThrow('Required resource not found — Next.js client');
  });
});

describe('getBackendJarPath', () => {
  it('returns the matching JAR in development', () => {
    setIsPackaged(false);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['ambrosia-0.8.0-beta.jar', 'other.txt']);

    const libsDirectory = path.join(__dirname, '..', '..', '..', 'server', 'app', 'build', 'libs');
    expect(resourcePaths.getBackendJarPath()).toBe(path.join(libsDirectory, 'ambrosia-0.8.0-beta.jar'));
  });

  it('throws a gradle-build hint in development when no JAR matches', () => {
    setIsPackaged(false);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['other.txt']);

    expect(() => resourcePaths.getBackendJarPath()).toThrow('Run: cd server && ./gradlew jar');
  });

  it('returns the bundled JAR path in production when it exists', () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    expect(resourcePaths.getBackendJarPath()).toBe(path.join('/fake/resources', 'backend', 'ambrosia.jar'));
  });

  it('throws when the bundled JAR is missing in production', () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => resourcePaths.getBackendJarPath()).toThrow('Required resource not found — Backend JAR');
  });
});

describe('getNodePath', () => {
  it('returns the bare node command in development', () => {
    setIsPackaged(false);

    expect(resourcePaths.getNodePath()).toBe('node');
  });

  it('returns the root-level node.exe path in production on Windows', () => {
    setIsPackaged(true);
    setPlatformAndArch('win32', 'x64');
    process.resourcesPath = '/fake/resources';

    expect(resourcePaths.getNodePath()).toBe(path.join('/fake/resources', 'node', 'win-x64', 'node.exe'));
  });

  it('returns the bin/node path in production on macOS', () => {
    setIsPackaged(true);
    setPlatformAndArch('darwin', 'arm64');
    process.resourcesPath = '/fake/resources';

    expect(resourcePaths.getNodePath()).toBe(path.join('/fake/resources', 'node', 'macos-arm64', 'bin', 'node'));
  });
});
