import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { STARTUP } from '../utils/constants.js';
import { healthCheck } from '../utils/healthCheck.js';
import { logger } from '../utils/logger.js';
import { getJavaPath, getBackendJarPath, getLogsDirectory } from '../utils/resourcePaths.js';

import { phoenixdCredentialsStore } from './PhoenixdCredentialsStore.js';
import { serverSecretStore } from './ServerSecretStore.js';
import { unlockPasswordStore } from './UnlockPasswordStore.js';

const require = createRequire(import.meta.url);
const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const CONFLICTING_JAVA_ENV_VARS = ['JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'JAVA_OPTS', 'JAVA_HOME'];

function stripConflictingJavaEnvVars(environment) {
  CONFLICTING_JAVA_ENV_VARS.forEach((envVarName) => delete environment[envVarName]);
}

export default class BackendService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
  }

  async start(port, startupConfig) {
    if (this.process) {
      throw new Error('Backend service is already running');
    }

    this.port = port;
    this.status = 'starting';

    try {
      const javaPath = getJavaPath();
      const jarPath = getBackendJarPath();
      const logsDirectory = getLogsDirectory();

      if (!fs.existsSync(logsDirectory)) {
        fs.mkdirSync(logsDirectory, { recursive: true });
      }

      const logFile = path.join(logsDirectory, `backend-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const commandArguments = [
        '-jar',
        jarPath,
        `--http-bind-ip=127.0.0.1`,
        `--http-bind-port=${port}`,
      ];
      if (!startupConfig.phoenixdRemoteConfigured) {
        commandArguments.push(`--phoenixd-url=http://localhost:${startupConfig.phoenixdPort}`);
      }

      const env = { ...process.env };
      stripConflictingJavaEnvVars(env);
      env.PHOENIXD_WEBHOOK_SECRET = startupConfig.webhookSecret;

      const phoenixdHttpPassword = phoenixdCredentialsStore.readHttpPassword();
      if (phoenixdHttpPassword) {
        env.PHOENIXD_PASSWORD = phoenixdHttpPassword;
      }

      const serverSecret = serverSecretStore.read();
      if (serverSecret) {
        env.AMBROSIA_SECRET = serverSecret;
      }

      const unlockPassword = unlockPasswordStore.read();
      if (unlockPassword) {
        env.AUTO_UNLOCK_PASSWORD = unlockPassword;
      }

      logger.log(`[BackendService] Starting backend at port ${port}...`);

      const spawnedProcess = spawn(javaPath, commandArguments, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      this.process = spawnedProcess;

      spawnedProcess.stdout.on('data', (chunk) => {
        const outputText = chunk.toString();
        logger.log(`[Backend] ${outputText.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${outputText}`);
        }
      });

      spawnedProcess.stderr.on('data', (chunk) => {
        const outputText = chunk.toString();
        logger.error(`[Backend ERROR] ${outputText.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${outputText}`);
        }
      });

      spawnedProcess.on('error', (spawnError) => {
        logger.error('[BackendService] Failed to start:', spawnError);
        if (this.process === spawnedProcess) {
          this.status = 'error';
          this.cleanup();
        }
      });

      spawnedProcess.on('close', (code) => {
        logger.log(`[BackendService] Process exited with code ${code}`);
        if (this.process === spawnedProcess) {
          this.status = 'stopped';
          this.cleanup();
        }
      });

      logger.log('[BackendService] Waiting for backend to be healthy...');
      await healthCheck.checkBackend(port);

      this.status = 'running';
      logger.log('[BackendService] Backend is running and healthy');

      return { port };
    } catch (startupError) {
      logger.error('[BackendService] Startup failed:', startupError);
      this.status = 'error';
      await this.stop();
      throw startupError;
    }
  }

  async stop() {
    if (!this.process) {
      logger.log('[BackendService] No process to stop');
      return;
    }

    logger.log('[BackendService] Stopping backend...');

    return new Promise((resolve) => {
      const pid = this.process.pid;
      const processToKill = this.process;

      const resolveStopOnCleanExit = () => {
        clearTimeout(forceKillTimer);
        logger.log('[BackendService] Process exited cleanly');
        this.cleanup();
        resolve();
      };

      processToKill.once('exit', resolveStopOnCleanExit);

      const forceKillTimer = setTimeout(() => {
        processToKill.removeListener('exit', resolveStopOnCleanExit);
        logger.warn('[BackendService] Force killing after timeout');
        treeKill(pid, 'SIGKILL', () => {
          this.cleanup();
          resolve();
        });
      }, STARTUP.BACKEND_FORCE_KILL_TIMEOUT_MILLISECONDS);

      treeKill(pid, 'SIGTERM', (killError) => {
        if (killError) {
          logger.error('[BackendService] Failed to kill process tree:', killError);
          clearTimeout(forceKillTimer);
          processToKill.removeListener('exit', resolveStopOnCleanExit);
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
