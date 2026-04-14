const fs = require('fs');
const path = require('path');

const spawn = require('cross-spawn');
const treeKill = require('tree-kill');

const { checkPhoenixd } = require('../utils/healthCheck');
const logger = require('../utils/logger');
const { getPhoenixdPath, getPhoenixDataDirectory, getLogsDirectory } = require('../utils/resourcePaths');

class PhoenixdService {
  constructor() {
    this.process = null;
    this.status = 'stopped';
    this.port = null;
    this.logStream = null;
  }

  async start(port) {
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

      // Only pass args that are not already in phoenix.conf (secrets stay in config file)
      const args = [
        '--agree-to-terms-of-service',
        `--http-bind-ip=127.0.0.1`,
        `--http-bind-port=${port}`,
      ];

      logger.log(`[PhoenixdService] Starting phoenixd at port ${port}...`);

      // Set JAVA_HOME for phoenixd when using JVM version
      // Windows ARM64 uses JVM version and needs x64 JRE
      // Linux ARM64 has native binary and doesn't need JRE
      // Other platforms use their native binaries
      const env = { ...process.env };

      if (process.platform === 'win32' && process.arch === 'arm64') {
        // Windows ARM64: phoenixd uses JVM version with x64 JRE (emulation)
        const { getBasePath } = require('../utils/resourcePaths');
        const javaPath = path.join(getBasePath(), 'jre', 'win-x64', 'bin', 'java.exe');
        env.JAVA_HOME = path.dirname(path.dirname(javaPath));
        logger.log(`[PhoenixdService] Using x64 JRE for phoenixd JVM version (Windows ARM64)`);
        logger.log(`[PhoenixdService] JAVA_HOME: ${env.JAVA_HOME}`);
      } else if (process.platform === 'linux' && process.arch === 'arm64') {
        // Linux ARM64: phoenixd has native ARM64 binary, no JRE needed
        logger.log(`[PhoenixdService] Using native ARM64 phoenixd binary (Linux ARM64)`);
      } else {
        // Other platforms: native binaries (macOS ARM64/x64, Linux x64, Windows x64)
        logger.log(`[PhoenixdService] Using native phoenixd binary for ${process.platform}-${process.arch}`);
      }

      const spawnedProcess = spawn(phoenixdPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env,
      });

      this.process = spawnedProcess;

      spawnedProcess.stdout.on('data', (data) => {
        const message = data.toString();
        logger.log(`[Phoenixd] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ${message}`);
        }
      });

      spawnedProcess.stderr.on('data', (data) => {
        const message = data.toString();
        logger.error(`[Phoenixd ERROR] ${message.trim()}`);
        if (this.logStream) {
          this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}`);
        }
      });

      spawnedProcess.on('error', (error) => {
        logger.error('[PhoenixdService] Failed to start:', error);
        this.status = 'error';
        if (this.process === spawnedProcess) this.cleanup();
      });

      spawnedProcess.on('close', (code) => {
        logger.log(`[PhoenixdService] Process exited with code ${code}`);
        // Only cleanup if this process is still the active one.
        // Avoids overwriting this.process after a restart has already set a new process.
        if (this.process === spawnedProcess) {
          this.status = 'stopped';
          this.cleanup();
        }
      });

      logger.log('[PhoenixdService] Waiting for phoenixd to be healthy...');
      await checkPhoenixd(port);

      this.status = 'running';
      logger.log('[PhoenixdService] Phoenixd is running and healthy');

      return { port };
    } catch (error) {
      logger.error('[PhoenixdService] Startup failed:', error);
      this.status = 'error';
      await this.stop();
      throw error;
    }
  }

  async killByPort(port) {
    const { exec } = require('child_process');
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
      }, 5000);

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          logger.error('[PhoenixdService] Failed to send SIGTERM:', err);
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

module.exports = PhoenixdService;
