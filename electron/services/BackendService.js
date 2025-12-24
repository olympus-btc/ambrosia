const fs = require('fs');
const path = require('path');

const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const { checkBackend } = require('../utils/healthCheck');
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
        `--phoenixd-password=${config.phoenixPassword}`,
        `--phoenixd-webhook-secret=${config.webhookSecret}`,
      ];

      console.log(`[BackendService] Starting backend at port ${port}...`);
      console.log(`[BackendService] Command: ${javaPath} ${args.join(' ')}`);

      this.process = spawn(javaPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.process.stdout.on('data', (data) => {
        const message = data.toString();
        console.log(`[Backend] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${message}`);
        }
      });

      this.process.stderr.on('data', (data) => {
        const message = data.toString();
        console.error(`[Backend ERROR] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
        }
      });

      this.process.on('error', (error) => {
        console.error('[BackendService] Failed to start:', error);
        this.status = 'error';
        this.cleanup();
      });

      this.process.on('close', (code) => {
        console.log(`[BackendService] Process exited with code ${code}`);
        this.status = 'stopped';
        this.cleanup();
      });

      console.log('[BackendService] Waiting for backend to be healthy...');
      await checkBackend(port);

      this.status = 'running';
      console.log('[BackendService] Backend is running and healthy');

      return { port };
    } catch (error) {
      console.error('[BackendService] Startup failed:', error);
      this.status = 'error';
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (!this.process) {
      console.log('[BackendService] No process to stop');
      return;
    }

    console.log('[BackendService] Stopping backend...');

    return new Promise((resolve) => {
      const pid = this.process.pid;

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.error('[BackendService] Failed to kill process tree:', err);
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        } else {
          console.log('[BackendService] Process tree killed successfully');
          this.cleanup();
          resolve();
        }
      });

      setTimeout(() => {
        if (this.process) {
          console.warn('[BackendService] Force killing after timeout');
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        }
      }, 10000);
    });
  }

  cleanup() {
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
