const fs = require('fs');
const os = require('os');
const path = require('path');

const loggerModule = require('../logger.js');
const {
  applyConfiguredLogLevel,
  applyLogLevel,
  normalizeLogLevel,
  readConfiguredLogLevel,
} = require('../logLevelConfiguration.js');

let temporaryHomeDirectory;

function writeAmbrosiaConfiguration(configurationText) {
  const dataDirectory = path.join(temporaryHomeDirectory, '.Ambrosia-POS');
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(path.join(dataDirectory, 'ambrosia.conf'), configurationText);
}

beforeEach(() => {
  temporaryHomeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ambrosia-log-level-'));
  vi.spyOn(os, 'homedir').mockReturnValue(temporaryHomeDirectory);
  loggerModule.setVerboseLogging(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  loggerModule.setVerboseLogging(false);
  fs.rmSync(temporaryHomeDirectory, { recursive: true, force: true });
});

describe('normalizeLogLevel', () => {
  it('accepts supported levels in any case and rejects the rest', () => {
    expect(normalizeLogLevel(' debug ')).toBe('DEBUG');
    expect(normalizeLogLevel('WARN')).toBe('WARN');
    expect(normalizeLogLevel('TRACE')).toBeNull();
    expect(normalizeLogLevel(undefined)).toBeNull();
  });
});

describe('readConfiguredLogLevel', () => {
  it('reads the log-level key written by the server', () => {
    writeAmbrosiaConfiguration('http-bind-port=9154\nlog-level=DEBUG\nsecret=abc\n');

    expect(readConfiguredLogLevel()).toBe('DEBUG');
  });

  it('returns null when the key or the file is missing', () => {
    expect(readConfiguredLogLevel()).toBeNull();

    writeAmbrosiaConfiguration('http-bind-port=9154\n');

    expect(readConfiguredLogLevel()).toBeNull();
  });
});

describe('applyLogLevel', () => {
  it('turns verbose logging on only for DEBUG', () => {
    expect(applyLogLevel('DEBUG')).toBe(true);
    expect(loggerModule.isVerboseLogging()).toBe(true);

    expect(applyLogLevel('INFO')).toBe(true);
    expect(loggerModule.isVerboseLogging()).toBe(false);
  });

  it('ignores unsupported levels', () => {
    loggerModule.setVerboseLogging(true);

    expect(applyLogLevel('LOUD')).toBe(false);
    expect(loggerModule.isVerboseLogging()).toBe(true);
  });
});

describe('applyConfiguredLogLevel', () => {
  it('applies the level saved in ambrosia.conf at startup', () => {
    writeAmbrosiaConfiguration('log-level=DEBUG\n');

    expect(applyConfiguredLogLevel()).toBe('DEBUG');
    expect(loggerModule.isVerboseLogging()).toBe(true);
  });
});
