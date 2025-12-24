const findFreePort = require('find-free-port');
const { isDevelopment } = require('./resourcePaths');

const DEFAULT_PORTS = {
  phoenixd: 9740,
  backend: 9154,
  nextjs: 3000,
};

async function allocatePorts() {
  if (isDevelopment()) {
    console.log('[PortAllocator] Development mode: using default ports');
    return {
      phoenixd: DEFAULT_PORTS.phoenixd,
      backend: DEFAULT_PORTS.backend,
      nextjs: DEFAULT_PORTS.nextjs,
    };
  }

  console.log('[PortAllocator] Production mode: allocating dynamic ports');

  try {
    const [phoenixdPort] = await findFreePort(9740, 9800);
    const [backendPort] = await findFreePort(9154, 9200);
    const [nextjsPort] = await findFreePort(3000, 3100);

    const ports = {
      phoenixd: phoenixdPort,
      backend: backendPort,
      nextjs: nextjsPort,
    };

    console.log('[PortAllocator] Allocated ports:', ports);
    return ports;
  } catch (error) {
    console.error('[PortAllocator] Failed to allocate ports:', error);
    console.log('[PortAllocator] Falling back to default ports');
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
