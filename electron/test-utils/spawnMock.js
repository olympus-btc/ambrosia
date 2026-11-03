const spawnPath = require.resolve('cross-spawn');
let spawnMock;

function installSpawnMock() {
  spawnMock = vi.fn();
  require.cache[spawnPath] = {
    id: spawnPath,
    filename: spawnPath,
    loaded: true,
    exports: spawnMock,
  };
  return spawnMock;
}

module.exports = { installSpawnMock };
