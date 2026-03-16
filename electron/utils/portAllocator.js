const findFreePort = require('find-free-port');

const logger = require('./logger');
const { isDevelopment } = require('./resourcePaths');

const DEFAULT_PORTS = {
  phoenixd: 9740,
  backend: 9154,
  nextjs: 3000,
};

async function allocatePorts() {
  if (isDevelopment()) {
    logger.log('[PortAllocator] Development mode: using default ports');
    return {
      phoenixd: DEFAULT_PORTS.phoenixd,
      backend: DEFAULT_PORTS.backend,
      nextjs: DEFAULT_PORTS.nextjs,
    };
  }

  logger.log('[PortAllocator] Production mode: allocating dynamic ports');

  try {
    const [phoenixdPort] = await findFreePort(9740, 9800);
    const [backendPort] = await findFreePort(9154, 9200);
    const [nextjsPort] = await findFreePort(3000, 3100);

    const ports = {
      phoenixd: phoenixdPort,
      backend: backendPort,
      nextjs: nextjsPort,
    };

    logger.log('[PortAllocator] Allocated ports:', ports);
    return ports;
  } catch (error) {
    logger.warn('[PortAllocator] Dynamic allocation failed, using defaults:', error.message);
    return {
      phoenixd: DEFAULT_PORTS.phoenixd,
      backend: DEFAULT_PORTS.backend,
      nextjs: DEFAULT_PORTS.nextjs,
    };
  }
}

module.exports = {
  allocatePorts,
  DEFAULT_PORTS,
};
