const fs = require('fs');
const path = require('path');

const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const { checkPhoenixd } = require('../utils/healthCheck');
const { getPhoenixdPath, getPhoenixDataDirectory, getLogsDirectory } = require('../utils/resourcePaths');

class PhoenixdService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
  }

  async start(port, config) {
    if (this.process) {
      throw new Error('Phoenixd service is already running');
    }

    this.port = port;
    this.status = 'starting';

    try {
      const phoenixdPath = getPhoenixdPath();
      const dataDir = getPhoenixDataDirectory();
      const logsDir = getLogsDirectory();

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const logFile = path.join(logsDir, `phoenixd-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const args = [
        '--agree-to-terms-of-service',
        `--http-bind-ip=127.0.0.1`,
        `--http-bind-port=${port}`,
      ];

      // Add optional config parameters
      if (config['http-password']) {
        args.push(`--http-password=${config['http-password']}`);
      }
      if (config['http-password-limited-access']) {
        args.push(`--http-password-limited-access=${config['http-password-limited-access']}`);
      }
      if (config.webhook) {
        args.push(`--webhook=${config.webhook}`);
      }
      if (config['webhook-secret']) {
        args.push(`--webhook-secret=${config['webhook-secret']}`);
      }
      if (config['auto-liquidity']) {
        args.push(`--auto-liquidity=${config['auto-liquidity']}`);
      }

      console.log(`[PhoenixdService] Starting phoenixd at port ${port}...`);
      console.log(`[PhoenixdService] Command: ${phoenixdPath} ${args.join(' ')}`);

      // Set JAVA_HOME for phoenixd.bat on Windows to use bundled JRE
      const env = { ...process.env };
      if (process.platform === 'win32') {
        const { getJavaPath, getBasePath } = require('../utils/resourcePaths');

        // Special case: phoenixd doesn't have native ARM64 support for Windows
        // We need to use x64 JRE (via emulation) even on ARM64
        let javaPath;
        if (process.arch === 'arm64') {
          // Use x64 JRE for phoenixd on ARM64 Windows (runs under emulation)
          const path = require('path');
          javaPath = path.join(getBasePath(), 'jre', 'win-x64', 'bin', 'java.exe');
          console.log(`[PhoenixdService] Using x64 JRE for phoenixd (ARM64 Windows emulation)`);
        } else {
          javaPath = getJavaPath();
        }

        // getJavaPath returns path to java.exe, we need the JRE directory
        const path = require('path');
        env.JAVA_HOME = path.dirname(path.dirname(javaPath));
        console.log(`[PhoenixdService] Setting JAVA_HOME: ${env.JAVA_HOME}`);
      }

      this.process = spawn(phoenixdPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      this.process.stdout.on('data', (data) => {
        const message = data.toString();
        console.log(`[Phoenixd] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${message}`);
        }
      });

      this.process.stderr.on('data', (data) => {
        const message = data.toString();
        console.error(`[Phoenixd ERROR] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
        }
      });

      this.process.on('error', (error) => {
        console.error('[PhoenixdService] Failed to start:', error);
        this.status = 'error';
        this.cleanup();
      });

      this.process.on('close', (code) => {
        console.log(`[PhoenixdService] Process exited with code ${code}`);
        this.status = 'stopped';
        this.cleanup();
      });

      console.log('[PhoenixdService] Waiting for phoenixd to be healthy...');
      await checkPhoenixd(port);

      this.status = 'running';
      console.log('[PhoenixdService] Phoenixd is running and healthy');

      return { port };
    } catch (error) {
      console.error('[PhoenixdService] Startup failed:', error);
      this.status = 'error';
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (!this.process) {
      console.log('[PhoenixdService] No process to stop');
      return;
    }

    console.log('[PhoenixdService] Stopping phoenixd...');

    return new Promise((resolve) => {
      const pid = this.process.pid;

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.error('[PhoenixdService] Failed to kill process tree:', err);
          treeKill(pid, 'SIGKILL', () => {
            this.cleanup();
            resolve();
          });
        } else {
          console.log('[PhoenixdService] Process tree killed successfully');
          this.cleanup();
          resolve();
        }
      });

      setTimeout(() => {
        if (this.process) {
          console.warn('[PhoenixdService] Force killing after timeout');
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
}

module.exports = PhoenixdService;
