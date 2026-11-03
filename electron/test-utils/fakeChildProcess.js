const { EventEmitter } = require('events');

function createFakeSpawnedProcess(pid = 1234) {
  const spawnedProcess = new EventEmitter();
  spawnedProcess.pid = pid;
  spawnedProcess.stdout = new EventEmitter();
  spawnedProcess.stderr = new EventEmitter();
  return spawnedProcess;
}

function createFakeWriteStream() {
  return { write: vi.fn(), end: vi.fn() };
}

module.exports = { createFakeSpawnedProcess, createFakeWriteStream };
