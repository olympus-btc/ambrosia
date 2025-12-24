const { EventEmitter } = require('events');

const { allocatePorts } = require('../utils/portAllocator');
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
        const result = await this.nextjsService.start(this.ports.nextjs);
        console.log('[ServiceManager] All services started successfully');
        return result.url;
      }

      console.log('[ServiceManager] Production mode: starting all bundled services');

      console.log('[ServiceManager] Step 1: Starting Phoenixd...');
      await this.phoenixdService.start(this.ports.phoenixd, phoenixConfig);
      this.emit('service:started', { service: 'phoenixd', port: this.ports.phoenixd });

      console.log('[ServiceManager] Step 2: Starting Backend...');
      await this.backendService.start(this.ports.backend, {
        phoenixdPort: this.ports.phoenixd,
        phoenixPassword: phoenixConfig['http-password'],
        webhookSecret: phoenixConfig['webhook-secret'],
      });
      this.emit('service:started', { service: 'backend', port: this.ports.backend });

      console.log('[ServiceManager] Step 3: Starting Next.js...');
      const result = await this.nextjsService.start(this.ports.nextjs);
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
      try {
        console.log('[ServiceManager] Stopping Backend...');
        await this.backendService.stop();
      } catch (error) {
        console.error('[ServiceManager] Error stopping Backend:', error);
      }

      try {
        console.log('[ServiceManager] Stopping Phoenixd...');
        await this.phoenixdService.stop();
      } catch (error) {
        console.error('[ServiceManager] Error stopping Phoenixd:', error);
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
          await this.nextjsService.start(this.ports.nextjs);
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
