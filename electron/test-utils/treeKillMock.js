const treeKillPath = require.resolve('tree-kill');
let treeKillMock;

function installTreeKillMock() {
  treeKillMock = vi.fn((_pid, _signal, callback) => callback());
  require.cache[treeKillPath] = {
    id: treeKillPath,
    filename: treeKillPath,
    loaded: true,
    exports: treeKillMock,
  };
  return treeKillMock;
}

module.exports = { installTreeKillMock };
