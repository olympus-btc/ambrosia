const os = require('os');
const path = require('path');

const { app } = require('electron');

function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'macos-arm64' : 'macos-x64';
  } else if (platform === 'win32') {
    return arch === 'arm64' ? 'win-arm64' : 'win-x64';
  } else if (platform === 'linux') {
    return 'linux-x64';
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function getBasePath() {
  if (isDevelopment()) {
    return path.join(__dirname, '..');
  }
  return process.resourcesPath;
}

function getJavaPath() {
  if (isDevelopment()) {
    return 'java';
  }

  const platform = getPlatform();
  const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
  const jrePath = path.join(getBasePath(), 'jre', platform, 'bin', javaExecutable);

  return jrePath;
}

function getBackendJarPath() {
  if (isDevelopment()) {
    const devJarPath = path.join(__dirname, '..', '..', 'server', 'app', 'build', 'libs', 'ambrosia-0.3.0-alpha.jar');
    return devJarPath;
  }

  const jarPath = path.join(getBasePath(), 'backend', 'ambrosia.jar');
  return jarPath;
}

function getPhoenixdPath() {
  if (isDevelopment()) {
    return 'phoenixd';
  }

  const platform = getPlatform();
  // Windows uses JVM version which has bin/phoenixd.bat structure
  const phoenixdExecutable = process.platform === 'win32' ? path.join('bin', 'phoenixd.bat') : 'phoenixd';
  const phoenixdPath = path.join(getBasePath(), 'phoenixd', platform, phoenixdExecutable);

  return phoenixdPath;
}

function getClientPath() {
  if (isDevelopment()) {
    return path.join(__dirname, '..', '..', 'client');
  }

  const clientPath = path.join(getBasePath(), 'client');
  return clientPath;
}

function getDataDirectory() {
  return path.join(os.homedir(), '.Ambrosia-POS');
}

function getPhoenixDataDirectory() {
  return path.join(os.homedir(), '.phoenix');
}

function getLogsDirectory() {
  return path.join(getDataDirectory(), 'logs');
}

function getNodePath() {
  if (isDevelopment()) {
    // For development, use the system's node
    return 'node';
  }

  // For production, use the included standalone Node.js binary
  const platform = getPlatform();
  const nodeExecutable = process.platform === 'win32' ? 'node.exe' : 'node';

  if (process.platform === 'win32') {
    // Windows - node.exe is in the root of the node directory
    const nodePath = path.join(getBasePath(), 'node', platform, nodeExecutable);
    return nodePath;
  } else {
    // MacOS/Linux - node is in bin/
    const nodePath = path.join(getBasePath(), 'node', platform, 'bin', nodeExecutable);
    return nodePath;
  }
}

module.exports = {
  getPlatform,
  isDevelopment,
  getBasePath,
  getJavaPath,
  getBackendJarPath,
  getPhoenixdPath,
  getClientPath,
  getDataDirectory,
  getPhoenixDataDirectory,
  getLogsDirectory,
  getNodePath,
};
