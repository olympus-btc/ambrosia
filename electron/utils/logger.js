import util from 'util';

import { ProcessLogWriter } from './processLogFiles.js';

const isDebugEnvironment = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const isRunningInsideElectron = Boolean(process.versions.electron);
const MAIN_PROCESS_LOG_NAME = 'main';

let isVerboseLoggingEnabled = isDebugEnvironment;
let mainProcessLogWriter = null;

export function setVerboseLogging(verboseLoggingEnabled) {
  isVerboseLoggingEnabled = isDebugEnvironment || Boolean(verboseLoggingEnabled);
}

export function isVerboseLogging() {
  return isVerboseLoggingEnabled;
}

function writeToMainProcessLogFile(logArguments, { isErrorOutput = false } = {}) {
  if (!isRunningInsideElectron) return;
  try {
    if (!mainProcessLogWriter) mainProcessLogWriter = new ProcessLogWriter(MAIN_PROCESS_LOG_NAME);
    mainProcessLogWriter.write(util.format(...logArguments), { isErrorOutput });
  } catch {
    mainProcessLogWriter = null;
  }
}

export function printChildProcessOutputToConsole(childProcessOutputLine, { isErrorOutput = false } = {}) {
  if (isErrorOutput) {
    console.error(childProcessOutputLine);
    return;
  }
  if (isVerboseLoggingEnabled) console.log(childProcessOutputLine);
}

export const logger = {
  log: (...logArguments) => {
    if (!isVerboseLoggingEnabled) return;
    console.log(...logArguments);
    writeToMainProcessLogFile(logArguments);
  },
  warn: (...logArguments) => {
    console.warn(...logArguments);
    writeToMainProcessLogFile(logArguments);
  },
  error: (...logArguments) => {
    console.error(...logArguments);
    writeToMainProcessLogFile(logArguments, { isErrorOutput: true });
  },
};
