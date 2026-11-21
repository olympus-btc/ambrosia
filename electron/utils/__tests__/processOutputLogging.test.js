const { EventEmitter } = require('events');

const { logger, setVerboseLogging } = require('../logger.js');
const { pipeProcessOutputToLogs } = require('../processOutputLogging.js');

function createFakeSpawnedProcessWithOutputStreams() {
  return { stdout: new EventEmitter(), stderr: new EventEmitter() };
}

describe('pipeProcessOutputToLogs', () => {
  beforeEach(() => {
    setVerboseLogging(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'log');
    vi.spyOn(logger, 'error');
  });

  afterEach(() => {
    setVerboseLogging(false);
    vi.restoreAllMocks();
  });

  it('writes standard output to the process log and the console', () => {
    const spawnedProcess = createFakeSpawnedProcessWithOutputStreams();
    const processLogWriter = { write: vi.fn() };
    pipeProcessOutputToLogs({ spawnedProcess, processLogWriter, consoleLabel: 'Backend' });

    spawnedProcess.stdout.emit('data', Buffer.from('server started\n'));

    expect(processLogWriter.write).toHaveBeenCalledWith('server started\n');
    expect(console.log).toHaveBeenCalledWith('[Backend] server started');
  });

  it('marks standard error output as errors', () => {
    const spawnedProcess = createFakeSpawnedProcessWithOutputStreams();
    const processLogWriter = { write: vi.fn() };
    pipeProcessOutputToLogs({ spawnedProcess, processLogWriter, consoleLabel: 'Phoenixd' });

    spawnedProcess.stderr.emit('data', Buffer.from('connection refused'));

    expect(processLogWriter.write).toHaveBeenCalledWith('connection refused', { isErrorOutput: true });
    expect(console.error).toHaveBeenCalledWith('[Phoenixd ERROR] connection refused');
  });

  it('does not copy child process output into the main process log', () => {
    const spawnedProcess = createFakeSpawnedProcessWithOutputStreams();
    const processLogWriter = { write: vi.fn() };
    pipeProcessOutputToLogs({ spawnedProcess, processLogWriter, consoleLabel: 'Backend' });

    spawnedProcess.stdout.emit('data', Buffer.from('request handled'));
    spawnedProcess.stderr.emit('data', Buffer.from('request failed'));

    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('hides standard output from the console when verbose logging is off', () => {
    setVerboseLogging(false);
    const spawnedProcess = createFakeSpawnedProcessWithOutputStreams();
    const processLogWriter = { write: vi.fn() };
    pipeProcessOutputToLogs({ spawnedProcess, processLogWriter, consoleLabel: 'Backend' });

    spawnedProcess.stdout.emit('data', Buffer.from('request handled'));

    expect(console.log).not.toHaveBeenCalled();
    expect(processLogWriter.write).toHaveBeenCalledWith('request handled');
  });
});
