const fs = require('fs');
const path = require('path');

const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const { checkBackend } = require('../utils/healthCheck');
const logger = require('../utils/logger');
const { getJavaPath, getBackendJarPath, getLogsDirectory } = require('../utils/resourcePaths');

class BackendService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
  }

  async start(port, config) {
    if (this.process) {
      throw new Error('Backend service is already running');
    }

    this.port = port;
    this.status = 'starting';

    try {
      const javaPath = getJavaPath();
      const jarPath = getBackendJarPath();
      const logsDir = getLogsDirectory();

      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, `backend-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const args = [
        '-jar',
        jarPath,
        `--http-bind-ip=127.0.0.1`,
        `--http-bind-port=${port}`,
        `--phoenixd-url=http://localhost:${config.phoenixdPort}`,
      ];

      // Secrets passed as env vars to avoid exposure in `ps aux` and log files
      const env = {
        ...process.env,
        PHOENIXD_PASSWORD: config.phoenixPassword,
        PHOENIXD_WEBHOOK_SECRET: config.webhookSecret,
      };

      logger.log(`[BackendService] Starting backend at port ${port}...`);

      const spawnedProcess = spawn(javaPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      this.process = spawnedProcess;

      spawnedProcess.stdout.on('data', (data) => {
        const message = data.toString();
        logger.log(`[Backend] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${message}`);
        }
      });

      spawnedProcess.stderr.on('data', (data) => {
        const message = data.toString();
        logger.error(`[Backend ERROR] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
        }
      });

      spawnedProcess.on('error', (error) => {
        logger.error('[BackendService] Failed to start:', error);
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
      await checkBackend(port);

      this.status = 'running';
      logger.log('[BackendService] Backend is running and healthy');

      return { port };
    } catch (error) {
      logger.error('[BackendService] Startup failed:', error);
      this.status = 'error';
      await this.stop();
      throw error;
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

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          logger.error('[BackendService] Failed to kill process tree:', err);
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        } else {
          logger.log('[BackendService] Process tree killed successfully');
          this.cleanup();
          resolve();
        }
      });

      setTimeout(() => {
        if (this.process) {
          logger.warn('[BackendService] Force killing after timeout');
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        }
      }, 10000);
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

module.exports = BackendService;
