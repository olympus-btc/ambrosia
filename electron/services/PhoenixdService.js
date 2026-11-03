import { exec } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

import { STARTUP } from '../utils/constants.js';
import { healthCheck } from '../utils/healthCheck.js';
import { logger } from '../utils/logger.js';
import { getPhoenixdPath, getPhoenixDataDirectory, getLogsDirectory, getBasePath } from '../utils/resourcePaths.js';

import { phoenixdCredentialsStore } from './PhoenixdCredentialsStore.js';

const require = createRequire(import.meta.url);
const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const CONFLICTING_JAVA_ENV_VARS = ['JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'JAVA_OPTS', 'JAVA_HOME'];

function stripConflictingJavaEnvVars(environment) {
  CONFLICTING_JAVA_ENV_VARS.forEach((envVarName) => delete environment[envVarName]);
}

function writeCredentialsTempDirectory(httpPassword, httpPasswordLimitedAccess) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ambrosia-phoenixd-'));
  const httpPasswordFilePath = path.join(temporaryDirectory, 'http-password');
  const httpPasswordLimitedAccessFilePath = path.join(temporaryDirectory, 'http-password-limited-access');

  fs.writeFileSync(httpPasswordFilePath, httpPassword, { mode: 0o600 });
  fs.writeFileSync(httpPasswordLimitedAccessFilePath, httpPasswordLimitedAccess, { mode: 0o600 });

  return { temporaryDirectory, httpPasswordFilePath, httpPasswordLimitedAccessFilePath };
}

function removeCredentialsTempDirectory(temporaryDirectory) {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

export default class PhoenixdService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
    this.credentialsTempDirectory = null;
  }

  async start(port) {
    if (this.process) {
      throw new Error('Phoenixd service is already running');
    }

    this.port = port;
    this.status = 'starting';

    try {
      const phoenixdPath = getPhoenixdPath();
      const dataDirectory = getPhoenixDataDirectory();
      const logsDirectory = getLogsDirectory();

      if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true });
      }

      if (!fs.existsSync(logsDirectory)) {
        fs.mkdirSync(logsDirectory, { recursive: true });
      }

      const logFile = path.join(logsDirectory, `phoenixd-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const httpPassword = phoenixdCredentialsStore.readHttpPassword();
      const httpPasswordLimitedAccess = phoenixdCredentialsStore.readHttpPasswordLimitedAccess();
      if (!httpPassword || !httpPasswordLimitedAccess) {
        throw new Error('Phoenixd http-password credentials are not available — cannot start phoenixd securely');
      }

      const {
        temporaryDirectory,
        httpPasswordFilePath,
        httpPasswordLimitedAccessFilePath,
      } = writeCredentialsTempDirectory(httpPassword, httpPasswordLimitedAccess);
      this.credentialsTempDirectory = temporaryDirectory;

      const commandArguments = [
        '--agree-to-terms-of-service',
        `--http-bind-ip=127.0.0.1`,
        `--http-bind-port=${port}`,
        `--http-password-file=${httpPasswordFilePath}`,
        `--http-password-limited-access-file=${httpPasswordLimitedAccessFilePath}`,
      ];

      logger.log(`[PhoenixdService] Starting phoenixd at port ${port}...`);

      const env = { ...process.env };

      if (process.platform === 'win32') {
        const bundledJreHome = path.join(getBasePath(), 'jre', 'win-x64');
        stripConflictingJavaEnvVars(env);
        env.JAVA_HOME = bundledJreHome;
        logger.log(`[PhoenixdService] Using bundled x64 JRE for phoenixd JVM version (${process.arch})`);
        logger.log(`[PhoenixdService] JAVA_HOME: ${bundledJreHome}`);
      } else if (process.platform === 'linux' && process.arch === 'arm64') {
        logger.log(`[PhoenixdService] Using native ARM64 phoenixd binary (Linux ARM64)`);
      } else {
        logger.log(`[PhoenixdService] Using native phoenixd binary for ${process.platform}-${process.arch}`);
      }

      const spawnedProcess = spawn(phoenixdPath, commandArguments, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      this.process = spawnedProcess;

      spawnedProcess.stdout.on('data', (chunk) => {
        const outputText = chunk.toString();
        logger.log(`[Phoenixd] ${outputText.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${outputText}`);
        }
      });

      spawnedProcess.stderr.on('data', (chunk) => {
        const outputText = chunk.toString();
        logger.error(`[Phoenixd ERROR] ${outputText.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${outputText}`);
        }
      });

      spawnedProcess.on('error', (spawnError) => {
        logger.error('[PhoenixdService] Failed to start:', spawnError);
        this.status = 'error';
        if (this.process === spawnedProcess) this.cleanup();
      });

      spawnedProcess.on('close', (code) => {
        logger.log(`[PhoenixdService] Process exited with code ${code}`);
        const isStillTheActiveProcess = this.process === spawnedProcess;
        if (isStillTheActiveProcess) {
          this.status = 'stopped';
          this.cleanup();
        }
      });

      logger.log('[PhoenixdService] Waiting for phoenixd to be healthy...');
      await healthCheck.checkPhoenixd(port);

      this.status = 'running';
      logger.log('[PhoenixdService] Phoenixd is running and healthy');

      return { port };
    } catch (startupError) {
      logger.error('[PhoenixdService] Startup failed:', startupError);
      this.status = 'error';
      await this.stop();
      throw startupError;
    } finally {
      if (this.credentialsTempDirectory) {
        removeCredentialsTempDirectory(this.credentialsTempDirectory);
        this.credentialsTempDirectory = null;
      }
    }
  }

  async killByPort(port) {
    const targetPort = port || this.port;
    if (!targetPort) return;
    if (!Number.isInteger(targetPort)) return;
    return new Promise((resolve) => {
      const command = process.platform === 'win32'
        ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr LISTENING ^| findstr :${targetPort}') do taskkill /F /PID %a`
        : `lsof -ti TCP:${targetPort} -sTCP:LISTEN | xargs kill -9`;
      exec(command, () => resolve());
    });
  }

  async stop() {
    if (!this.process) {
      if (this.port) {
        logger.log(`[PhoenixdService] No owned process — attempting to kill any process on port ${this.port}`);
        await this.killByPort(this.port);
        await new Promise((resolve) => { setTimeout(resolve, 500); });
      } else {
        logger.log('[PhoenixdService] No process to stop');
      }
      return;
    }

    logger.log('[PhoenixdService] Stopping phoenixd...');

    return new Promise((resolve) => {
      const pid = this.process.pid;
      const processToKill = this.process;

      const onExit = () => {
        clearTimeout(forceKillTimer);
        logger.log('[PhoenixdService] Process exited cleanly');
        this.cleanup();
        resolve();
      };

      processToKill.once('exit', onExit);

      const forceKillTimer = setTimeout(() => {
        processToKill.removeListener('exit', onExit);
        logger.warn('[PhoenixdService] Force killing after timeout');
        treeKill(pid, 'SIGKILL', () => {
          this.cleanup();
          resolve();
        });
      }, STARTUP.FORCE_KILL_TIMEOUT_MILLISECONDS);

      treeKill(pid, 'SIGTERM', (killError) => {
        if (killError) {
          logger.error('[PhoenixdService] Failed to send SIGTERM:', killError);
          clearTimeout(forceKillTimer);
          processToKill.removeListener('exit', onExit);
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        }
      });
    });
  }

  cleanup() {
    if (this.process) {
      this.process.removeAllListeners();
    }
    this.process = null;
    this.status = 'stopped';
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  getStatus() {
    return this.status;
  }

  getPort() {
    return this.port;
  }
}
