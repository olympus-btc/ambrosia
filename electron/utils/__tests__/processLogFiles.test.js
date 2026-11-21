const { once } = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { formatLogFileDate, ProcessLogWriter, pruneProcessLogFiles } = require('../processLogFiles.js');

const ONE_DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

let temporaryHomeDirectory;
let logsDirectory;
let electronLogsDirectory;

function createLogFile(directoryPath, fileName, { sizeInBytes = 10, ageInDays = 0 } = {}) {
  fs.mkdirSync(directoryPath, { recursive: true });
  const filePath = path.join(directoryPath, fileName);
  fs.writeFileSync(filePath, 'x'.repeat(sizeInBytes));
  const modifiedAt = new Date(Date.now() - ageInDays * ONE_DAY_MILLISECONDS);
  fs.utimesSync(filePath, modifiedAt, modifiedAt);
  return filePath;
}

beforeEach(() => {
  temporaryHomeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ambrosia-process-logs-'));
  vi.spyOn(os, 'homedir').mockReturnValue(temporaryHomeDirectory);
  logsDirectory = path.join(temporaryHomeDirectory, '.Ambrosia-POS', 'logs');
  electronLogsDirectory = path.join(logsDirectory, 'electron');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(temporaryHomeDirectory, { recursive: true, force: true });
});

describe('ProcessLogWriter', () => {
  it('writes each output line with a timestamp prefix to the daily file', async () => {
    const processLogWriter = new ProcessLogWriter('backend');

    processLogWriter.write('first line\nsecond line\n');
    processLogWriter.write('broken pipe', { isErrorOutput: true });
    await new Promise((resolve) => processLogWriter.logFileStream.end(resolve));

    const logFilePath = path.join(electronLogsDirectory, `backend-${formatLogFileDate(new Date())}.log`);
    const writtenLines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
    expect(writtenLines).toHaveLength(3);
    expect(writtenLines[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*Z\] first line$/);
    expect(writtenLines[1]).toMatch(/\] second line$/);
    expect(writtenLines[2]).toMatch(/\] ERROR: broken pipe$/);
  });

  it('drops a failed log file stream and opens a new one on the next write', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const processLogWriter = new ProcessLogWriter('backend');
    const failedLogFileStream = processLogWriter.logFileStream;

    failedLogFileStream.emit('error', new Error('EACCES: permission denied'));

    expect(processLogWriter.logFileStream).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('EACCES: permission denied'));

    processLogWriter.write('written after the failure');
    expect(processLogWriter.logFileStream).not.toBe(failedLogFileStream);
    await new Promise((resolve) => processLogWriter.logFileStream.end(resolve));

    const logFilePath = path.join(electronLogsDirectory, `backend-${formatLogFileDate(new Date())}.log`);
    expect(fs.readFileSync(logFilePath, 'utf8')).toContain('written after the failure');
  });

  it('does not throw when the logs directory cannot be created', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(path.join(temporaryHomeDirectory, '.Ambrosia-POS'), { recursive: true });
    fs.writeFileSync(logsDirectory, 'a file where the logs directory should be');

    const processLogWriter = new ProcessLogWriter('phoenixd');

    expect(() => processLogWriter.write('output that cannot be saved')).not.toThrow();
    expect(processLogWriter.logFileStream).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Could not write the phoenixd log file'));
  });
});

describe('ProcessLogWriter after end', () => {
  it('ignores output written after the writer was ended', async () => {
    const processLogWriter = new ProcessLogWriter('nextjs');
    const openedLogFileStream = processLogWriter.logFileStream;
    processLogWriter.end();
    await once(openedLogFileStream, 'close');

    processLogWriter.write('late output');

    expect(processLogWriter.logFileStream).toBeNull();
  });
});

describe('pruneProcessLogFiles', () => {
  it('deletes process logs older than the retention period, including legacy files', () => {
    const expiredProcessLog = createLogFile(electronLogsDirectory, 'nextjs-2026-01-01.log', { ageInDays: 8 });
    const expiredLegacyLog = createLogFile(logsDirectory, 'backend-2026-01-01.log', { ageInDays: 10 });
    const recentProcessLog = createLogFile(electronLogsDirectory, 'nextjs-2026-11-19.log', { ageInDays: 1 });
    const serverLog = createLogFile(logsDirectory, 'server.log', { ageInDays: 30 });

    const deletedFilePaths = pruneProcessLogFiles();

    expect(deletedFilePaths.sort()).toEqual([expiredLegacyLog, expiredProcessLog].sort());
    expect(fs.existsSync(recentProcessLog)).toBe(true);
    expect(fs.existsSync(serverLog)).toBe(true);
  });

  it('deletes the oldest process logs until the total size fits the limit', () => {
    const oldestProcessLog = createLogFile(electronLogsDirectory, 'phoenixd-2026-11-16.log', { sizeInBytes: 60, ageInDays: 3 });
    const middleProcessLog = createLogFile(electronLogsDirectory, 'phoenixd-2026-11-17.log', { sizeInBytes: 60, ageInDays: 2 });
    const newestProcessLog = createLogFile(electronLogsDirectory, 'phoenixd-2026-11-18.log', { sizeInBytes: 60, ageInDays: 1 });

    const deletedFilePaths = pruneProcessLogFiles({ maximumTotalBytes: 130 });

    expect(deletedFilePaths).toEqual([oldestProcessLog]);
    expect(fs.existsSync(middleProcessLog)).toBe(true);
    expect(fs.existsSync(newestProcessLog)).toBe(true);
  });

  it('never deletes the log files of the current day, even when they exceed the limit', () => {
    const currentDayProcessLog = createLogFile(
      electronLogsDirectory,
      `backend-${formatLogFileDate(new Date())}.log`,
      { sizeInBytes: 200 },
    );
    const olderProcessLog = createLogFile(electronLogsDirectory, 'backend-2026-01-02.log', { sizeInBytes: 10, ageInDays: 1 });

    const deletedFilePaths = pruneProcessLogFiles({ maximumTotalBytes: 100 });

    expect(deletedFilePaths).toEqual([olderProcessLog]);
    expect(fs.existsSync(currentDayProcessLog)).toBe(true);
  });

  it('returns nothing when the logs directories do not exist', () => {
    expect(pruneProcessLogFiles()).toEqual([]);
  });
});
