import fs from 'fs';
import path from 'path';

import { getElectronLogsDirectory, getLogsDirectory } from './dataDirectories.js';

export const PROCESS_LOG_RETENTION_DAYS = 7;
export const PROCESS_LOGS_MAXIMUM_TOTAL_BYTES = 20 * 1024 * 1024;

const ONE_DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const PROCESS_LOG_FILE_NAME_PATTERN = /^[a-z]+-\d{4}-\d{2}-\d{2}\.log$/;
const LEGACY_PROCESS_LOG_FILE_NAME_PATTERN = /^(backend|phoenixd|nextjs)-\d{4}-\d{2}-\d{2}\.log$/;

export function formatLogFileDate(logFileDateTime) {
  const year = logFileDateTime.getFullYear();
  const month = String(logFileDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(logFileDateTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ProcessLogWriter {
  constructor(processName) {
    this.processName = processName;
    this.currentLogFileDate = null;
    this.logFileStream = null;
    this.isEnded = false;
    this.openLogFileForDate(new Date());
  }

  openLogFileForDate(logFileDateTime) {
    const logFileDate = formatLogFileDate(logFileDateTime);
    if (this.logFileStream && this.currentLogFileDate === logFileDate) return;

    const isDailyRotation = this.currentLogFileDate !== null;
    if (this.logFileStream) this.logFileStream.end();
    if (isDailyRotation) pruneProcessLogFiles();
    this.logFileStream = null;
    this.currentLogFileDate = null;
    try {
      const electronLogsDirectory = getElectronLogsDirectory();
      if (!fs.existsSync(electronLogsDirectory)) {
        fs.mkdirSync(electronLogsDirectory, { recursive: true });
      }
      const logFilePath = path.join(electronLogsDirectory, `${this.processName}-${logFileDate}.log`);
      const logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      logFileStream.on('error', (logFileStreamError) => this.discardFailedLogFileStream(logFileStream, logFileStreamError));
      this.logFileStream = logFileStream;
      this.currentLogFileDate = logFileDate;
    } catch (openLogFileError) {
      this.reportLogFileError(openLogFileError);
    }
  }

  discardFailedLogFileStream(failedLogFileStream, logFileStreamError) {
    this.reportLogFileError(logFileStreamError);
    if (this.logFileStream !== failedLogFileStream) return;
    this.logFileStream = null;
    this.currentLogFileDate = null;
  }

  reportLogFileError(logFileError) {
    console.error(`[ProcessLogWriter] Could not write the ${this.processName} log file: ${logFileError.message}`);
  }

  write(outputText, { isErrorOutput = false } = {}) {
    if (this.isEnded) return;
    const writeDateTime = new Date();
    this.openLogFileForDate(writeDateTime);
    if (!this.logFileStream) return;
    const linePrefix = `[${writeDateTime.toISOString()}] ${isErrorOutput ? 'ERROR: ' : ''}`;
    String(outputText)
      .split(/\r?\n/)
      .filter((outputLine) => outputLine.length > 0)
      .forEach((outputLine) => this.logFileStream.write(`${linePrefix}${outputLine}\n`));
  }

  end() {
    this.isEnded = true;
    if (this.logFileStream) this.logFileStream.end();
    this.logFileStream = null;
    this.currentLogFileDate = null;
  }
}

function listProcessLogFiles(directoryPath, fileNamePattern) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => fileNamePattern.test(fileName))
    .map((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const fileStats = fs.statSync(filePath);
      return { fileName, filePath, sizeInBytes: fileStats.size, modifiedAtMilliseconds: fileStats.mtimeMs };
    });
}

function deleteLogFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function pruneProcessLogFiles({
  currentTimeMilliseconds = Date.now(),
  retentionDays = PROCESS_LOG_RETENTION_DAYS,
  maximumTotalBytes = PROCESS_LOGS_MAXIMUM_TOTAL_BYTES,
} = {}) {
  let processLogFiles;
  try {
    processLogFiles = [
      ...listProcessLogFiles(getElectronLogsDirectory(), PROCESS_LOG_FILE_NAME_PATTERN),
      ...listProcessLogFiles(getLogsDirectory(), LEGACY_PROCESS_LOG_FILE_NAME_PATTERN),
    ];
  } catch {
    return [];
  }

  const currentLogFileDateSuffix = `-${formatLogFileDate(new Date(currentTimeMilliseconds))}.log`;
  const deletableProcessLogFiles = processLogFiles.filter(
    (processLogFile) => !processLogFile.fileName.endsWith(currentLogFileDateSuffix),
  );
  const deletedFilePaths = [];
  const retentionLimitMilliseconds = retentionDays * ONE_DAY_MILLISECONDS;
  const retainedLogFiles = deletableProcessLogFiles.filter((processLogFile) => {
    const isExpired = currentTimeMilliseconds - processLogFile.modifiedAtMilliseconds > retentionLimitMilliseconds;
    if (isExpired && deleteLogFile(processLogFile.filePath)) {
      deletedFilePaths.push(processLogFile.filePath);
      return false;
    }
    return true;
  });

  const retainedLogFilesOldestFirst = [...retainedLogFiles].sort(
    (firstLogFile, secondLogFile) => firstLogFile.modifiedAtMilliseconds - secondLogFile.modifiedAtMilliseconds,
  );
  const currentDayLogFilesBytes = processLogFiles
    .filter((processLogFile) => processLogFile.fileName.endsWith(currentLogFileDateSuffix))
    .reduce((totalBytes, logFile) => totalBytes + logFile.sizeInBytes, 0);
  let retainedTotalBytes = retainedLogFilesOldestFirst.reduce(
    (totalBytes, logFile) => totalBytes + logFile.sizeInBytes,
    currentDayLogFilesBytes,
  );
  for (const oldestLogFile of retainedLogFilesOldestFirst) {
    if (retainedTotalBytes <= maximumTotalBytes) break;
    if (deleteLogFile(oldestLogFile.filePath)) {
      deletedFilePaths.push(oldestLogFile.filePath);
      retainedTotalBytes -= oldestLogFile.sizeInBytes;
    }
  }

  return deletedFilePaths;
}
