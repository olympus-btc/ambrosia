import { printChildProcessOutputToConsole } from './logger.js';

export function pipeProcessOutputToLogs({ spawnedProcess, processLogWriter, consoleLabel }) {
  spawnedProcess.stdout.on('data', (standardOutputChunk) => {
    const standardOutputText = standardOutputChunk.toString();
    printChildProcessOutputToConsole(`[${consoleLabel}] ${standardOutputText.trim()}`);
    processLogWriter.write(standardOutputText);
  });

  spawnedProcess.stderr.on('data', (standardErrorChunk) => {
    const standardErrorText = standardErrorChunk.toString();
    printChildProcessOutputToConsole(`[${consoleLabel} ERROR] ${standardErrorText.trim()}`, { isErrorOutput: true });
    processLogWriter.write(standardErrorText, { isErrorOutput: true });
  });
}
