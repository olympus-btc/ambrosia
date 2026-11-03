import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { app } = require('electron');

export function getPlatform() {
  const platform = process.platform;
  const architecture = process.arch;

  if (platform === 'darwin') {
    return architecture === 'arm64' ? 'macos-arm64' : 'macos-x64';
  } else if (platform === 'win32') {
    return architecture === 'arm64' ? 'win-arm64' : 'win-x64';
  } else if (platform === 'linux') {
    return architecture === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

export function getBasePath() {
  if (isDevelopment()) {
    return path.join(import.meta.dirname, '..');
  }
  return process.resourcesPath;
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required resource not found — ${label}: ${filePath}`);
  }
  return filePath;
}

export function getJavaPath() {
  if (isDevelopment()) {
    return 'java';
  }

  const platform = getPlatform();
  const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
  const jrePath = path.join(getBasePath(), 'jre', platform, 'bin', javaExecutable);

  return assertExists(jrePath, 'Java runtime');
}

export function getBackendJarPath() {
  if (isDevelopment()) {
    const libsDirectory = path.join(import.meta.dirname, '..', '..', 'server', 'app', 'build', 'libs');
    const jarFilenames = fs.readdirSync(libsDirectory).filter(
      (jarFilename) => jarFilename.startsWith('ambrosia-') && jarFilename.endsWith('.jar'),
    );
    if (jarFilenames.length === 0) {
      throw new Error(`No backend JAR found in ${libsDirectory}. Run: cd server && ./gradlew jar`);
    }
    return path.join(libsDirectory, jarFilenames[0]);
  }

  const jarPath = path.join(getBasePath(), 'backend', 'ambrosia.jar');
  return assertExists(jarPath, 'Backend JAR');
}

export function getPhoenixdPath() {
  if (isDevelopment()) {
    return 'phoenixd';
  }

  const platform = getPlatform();
  const phoenixdExecutable = process.platform === 'win32' ? path.join('bin', 'phoenixd.bat') : 'phoenixd';
  const phoenixdPath = path.join(getBasePath(), 'phoenixd', platform, phoenixdExecutable);

  return assertExists(phoenixdPath, 'Phoenixd binary');
}

export function getClientPath() {
  if (isDevelopment()) {
    return path.join(import.meta.dirname, '..', '..', 'client');
  }

  const clientPath = path.join(getBasePath(), 'client');
  return assertExists(clientPath, 'Next.js client');
}

export function getDataDirectory() {
  return path.join(os.homedir(), '.Ambrosia-POS');
}

export function getPhoenixDataDirectory() {
  return path.join(os.homedir(), '.phoenix');
}

export function getLogsDirectory() {
  return path.join(getDataDirectory(), 'logs');
}

export function getNodePath() {
  if (isDevelopment()) {
    return 'node';
  }

  const platform = getPlatform();
  const nodeExecutable = process.platform === 'win32' ? 'node.exe' : 'node';

  if (process.platform === 'win32') {
    return path.join(getBasePath(), 'node', platform, nodeExecutable);
  }

  return path.join(getBasePath(), 'node', platform, 'bin', nodeExecutable);
}
