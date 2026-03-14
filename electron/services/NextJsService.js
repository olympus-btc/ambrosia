const fs = require('fs');
const path = require('path');

const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const { checkNextJs } = require('../utils/healthCheck');
const logger = require('../utils/logger');
const { getClientPath, getLogsDirectory, isDevelopment, getNodePath } = require('../utils/resourcePaths');

class NextJsService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
  }

  async start(port, backendConfig = {}) {
    if (this.process) {
      throw new Error('Next.js service is already running');
    }

    this.port = port;
    this.status = 'starting';

    try {
      const clientPath = getClientPath();
      const logsDir = getLogsDirectory();

      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, `nextjs-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const isDev = isDevelopment();
      let command, args, cwd;

      if (isDev) {
        command = 'npm';
        args = ['run', 'dev', '--', '-p', port.toString()];
        cwd = clientPath;
      } else {
        // Use standalone Node.js binary to run server.js
        command = getNodePath();
        args = [path.join(clientPath, 'server.js')];
        cwd = clientPath;
      }

      logger.log(`[NextJsService] Starting Next.js at port ${port}...`);
      logger.log(`[NextJsService] Command: ${command} ${args.join(' ')}`);
      logger.log(`[NextJsService] Working directory: ${cwd}`);
      logger.log(`[NextJsService] Environment PORT: ${port}`);

      // Use backend config passed as parameter (with fallback to defaults)
      const backendHost = backendConfig.host || 'localhost';
      const backendPort = backendConfig.port || '9154';
      const apiUrl = `http://${backendHost}:${backendPort}`;

      logger.log(`[NextJsService] Backend configuration: ${apiUrl}`);

      // Verify server.js exists (only in production mode)
      if (!isDev) {
        const serverJsPath = path.join(cwd, 'server.js');
        if (!fs.existsSync(serverJsPath)) {
          throw new Error(`server.js not found at: ${serverJsPath}`);
        }
        logger.log(`[NextJsService] Verified server.js exists at: ${serverJsPath}`);
      }

      const env = {
        PORT: port.toString(),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: process.env.NODE_ENV || 'production',
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NEXT_PUBLIC_API_URL: apiUrl,
        NEXT_PUBLIC_ELECTRON: 'true',
      };

      logger.log(`[NextJsService] Environment variables:`, {
        PORT: env.PORT,
        HOSTNAME: env.HOSTNAME,
        NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_ELECTRON: env.NEXT_PUBLIC_ELECTRON,
      });

      logger.log(`[NextJsService] Spawning process...`);
      this.process = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      if (!this.process || !this.process.pid) {
        throw new Error('Failed to spawn Next.js process');
      }
      logger.log(`[NextJsService] Process spawned with PID: ${this.process.pid}`);

      this.process.stdout.on('data', (data) => {
        const message = data.toString();
        logger.log(`[Next.js] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${message}`);
        }
      });

      this.process.stderr.on('data', (data) => {
        const message = data.toString();
        logger.error(`[Next.js ERROR] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
        }
      });

      this.process.on('error', (error) => {
        logger.error('[NextJsService] Failed to start:', error);
        this.status = 'error';
        this.cleanup();
      });

      this.process.on('close', (code) => {
        logger.log(`[NextJsService] Process exited with code ${code}`);
        this.status = 'stopped';
        this.cleanup();
      });

      logger.log('[NextJsService] Waiting for Next.js to be healthy...');
      await checkNextJs(port);

      this.status = 'running';
      logger.log('[NextJsService] Next.js is running and healthy');

      return { port, url: `http://localhost:${port}` };
    } catch (error) {
      logger.error('[NextJsService] Startup failed:', error);
      this.status = 'error';
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (!this.process) {
      logger.log('[NextJsService] No process to stop');
      return;
    }

    logger.log('[NextJsService] Stopping Next.js...');

    return new Promise((resolve) => {
      const pid = this.process.pid;

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          logger.error('[NextJsService] Failed to kill process tree:', err);
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        } else {
          logger.log('[NextJsService] Process tree killed successfully');
          this.cleanup();
          resolve();
        }
      });

      setTimeout(() => {
        if (this.process) {
          logger.warn('[NextJsService] Force killing after timeout');
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        }
      }, 5000);
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

  getUrl() {
    return this.port ? `http://localhost:${this.port}` : null;
  }
}

module.exports = NextJsService;
