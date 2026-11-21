const fs = require('fs');
const os = require('os');
const path = require('path');

const { readConfigurationFile } = require('../configurationFile.js');

describe('readConfigurationFile', () => {
  it('reads key value pairs, keeps equals signs inside values and skips comments', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ambrosia-configuration-file-'));
    const configurationFilePath = path.join(temporaryDirectory, 'ambrosia.conf');
    fs.writeFileSync(configurationFilePath, '# comment\nlog-level=DEBUG\nsecret=abc=def\n\n');

    expect(readConfigurationFile(configurationFilePath)).toEqual({ 'log-level': 'DEBUG', secret: 'abc=def' });

    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('returns an empty object when the file does not exist', () => {
    expect(readConfigurationFile('/does/not/exist.conf')).toEqual({});
  });
});
