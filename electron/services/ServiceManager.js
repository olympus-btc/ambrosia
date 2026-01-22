const { EventEmitter } = require('events');

const { isPhoenixdRunning, isBackendRunning } = require('../utils/healthCheck');
const { allocatePorts, DEFAULT_PORTS } = require('../utils/portAllocator');
const { isDevelopment } = require('../utils/resourcePaths');

const BackendService = require('./BackendService');
const { ensureConfigurations } = require('./ConfigurationBootstrap');
const NextJsService = require('./NextJsService');
const PhoenixdService = require('./PhoenixdService');

class ServiceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.devMode = options.devMode || isDevelopment();
    this.phoenixdService = new PhoenixdService();
    this.backendService = new BackendService();
    this.nextjsService = new NextJsService();
    this.ports = null;
    this.configs = null;
    // Track which services are external (not managed by us)
    this.externalServices = {
      phoenixd: false,
      backend: false,
    };
  }

  async startAll() {
    try {
      console.log('[ServiceManager] Starting all services...');

      this.ports = await allocatePorts();
      console.log('[ServiceManager] Allocated ports:', this.ports);

      console.log('[ServiceManager] Ensuring configurations...');
      this.configs = await ensureConfigurations(this.ports);

      const phoenixConfig = this.configs.phoenix;

      if (this.devMode) {
        console.log('[ServiceManager] Development mode: skipping phoenixd and backend startup');
        console.log('[ServiceManager] Assuming external services at:');
        console.log('  - phoenixd: http://localhost:9740');
        console.log('  - backend: http://localhost:9154');

        console.log('[ServiceManager] Starting Next.js service...');
        const result = await this.nextjsService.start(this.ports.nextjs, {
          host: '127.0.0.1',
          port: this.ports.backend,
        });
        console.log('[ServiceManager] All services started successfully');
        return result.url;
      }

      console.log('[ServiceManager] Production mode: starting all bundled services');

      // Step 1: Check if phoenixd is already running on default port
      console.log('[ServiceManager] Step 1: Checking for existing Phoenixd...');
      const phoenixdAlreadyRunning = await isPhoenixdRunning(DEFAULT_PORTS.phoenixd);

      if (phoenixdAlreadyRunning) {
        console.log(`[ServiceManager] Phoenixd already running on port ${DEFAULT_PORTS.phoenixd}, reusing...`);
        this.ports.phoenixd = DEFAULT_PORTS.phoenixd;
        this.externalServices.phoenixd = true;
      } else {
        console.log('[ServiceManager] Starting Phoenixd...');
        await this.phoenixdService.start(this.ports.phoenixd, phoenixConfig);
      }
      this.emit('service:started', { service: 'phoenixd', port: this.ports.phoenixd });

      // Step 2: Check if backend is already running on default port
      console.log('[ServiceManager] Step 2: Checking for existing Backend...');
      const backendAlreadyRunning = await isBackendRunning(DEFAULT_PORTS.backend);

      if (backendAlreadyRunning) {
        console.log(`[ServiceManager] Backend already running on port ${DEFAULT_PORTS.backend}, reusing...`);
        this.ports.backend = DEFAULT_PORTS.backend;
        this.externalServices.backend = true;
      } else {
        console.log('[ServiceManager] Starting Backend...');
        await this.backendService.start(this.ports.backend, {
          phoenixdPort: this.ports.phoenixd,
          phoenixPassword: phoenixConfig['http-password'],
          webhookSecret: phoenixConfig['webhook-secret'],
        });
      }
      this.emit('service:started', { service: 'backend', port: this.ports.backend });

      // Step 3: Start Next.js (always start our own)
      console.log('[ServiceManager] Step 3: Starting Next.js...');
      const result = await this.nextjsService.start(this.ports.nextjs, {
        host: '127.0.0.1',
        port: this.ports.backend,
      });
      this.emit('service:started', { service: 'nextjs', port: this.ports.nextjs });

      console.log('[ServiceManager] All services started successfully');
      this.emit('all:started');

      return result.url;
    } catch (error) {
      console.error('[ServiceManager] Failed to start services:', error);
      this.emit('service:error', { error });
      await this.stopAll();
      throw error;
    }
  }

  async stopAll() {
    console.log('[ServiceManager] Stopping all services...');

    try {
      console.log('[ServiceManager] Stopping Next.js...');
      await this.nextjsService.stop();
    } catch (error) {
      console.error('[ServiceManager] Error stopping Next.js:', error);
    }

    if (!this.devMode) {
      // Only stop backend if we started it (not external)
      if (!this.externalServices.backend) {
        try {
          console.log('[ServiceManager] Stopping Backend...');
          await this.backendService.stop();
        } catch (error) {
          console.error('[ServiceManager] Error stopping Backend:', error);
        }
      } else {
        console.log('[ServiceManager] Backend is external, not stopping');
      }

      // Only stop phoenixd if we started it (not external)
      if (!this.externalServices.phoenixd) {
        try {
          console.log('[ServiceManager] Stopping Phoenixd...');
          await this.phoenixdService.stop();
        } catch (error) {
          console.error('[ServiceManager] Error stopping Phoenixd:', error);
        }
      } else {
        console.log('[ServiceManager] Phoenixd is external, not stopping');
      }
    }

    console.log('[ServiceManager] All services stopped');
    this.emit('all:stopped');
  }

  getServiceStatuses() {
    return {
      phoenixd: this.phoenixdService.getStatus(),
      backend: this.backendService.getStatus(),
      nextjs: this.nextjsService.getStatus(),
    };
  }

  getPorts() {
    return {
      phoenixd: this.phoenixdService.getPort(),
      backend: this.backendService.getPort(),
      nextjs: this.nextjsService.getPort(),
    };
  }

  async restartService(serviceName) {
    console.log(`[ServiceManager] Restarting ${serviceName}...`);

    try {
      switch (serviceName) {
        case 'phoenixd':
          await this.phoenixdService.stop();
          await this.phoenixdService.start(this.ports.phoenixd, this.configs.phoenix);
          break;
        case 'backend':
          await this.backendService.stop();
          await this.backendService.start(this.ports.backend, {
            phoenixdPort: this.ports.phoenixd,
            phoenixPassword: this.configs.phoenix['http-password'],
            webhookSecret: this.configs.phoenix['webhook-secret'],
          });
          break;
        case 'nextjs':
          await this.nextjsService.stop();
          await this.nextjsService.start(this.ports.nextjs, {
            host: '127.0.0.1',
            port: this.ports.backend,
          });
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
      console.log(`[ServiceManager] ${serviceName} restarted successfully`);
      this.emit('service:restarted', { service: serviceName });
    } catch (error) {
      console.error(`[ServiceManager] Failed to restart ${serviceName}:`, error);
      this.emit('service:error', { service: serviceName, error });
      throw error;
    }
  }

  isDevMode() {
    return this.devMode;
  }
}

module.exports = ServiceManager;
