const originalEnv = { ...process.env };

async function loadLoggerWithEnv(envOverrides) {
  delete process.env.DEBUG;
  delete process.env.NODE_ENV;
  Object.assign(process.env, envOverrides);
  vi.resetModules();
  const loggerModule = await import('../logger.js');
  return loggerModule.logger;
}

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe('log', () => {
    it('does not call console.log when DEBUG and NODE_ENV are unset', async () => {
      const logger = await loadLoggerWithEnv({});

      logger.log('startup message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('calls console.log with the given arguments when DEBUG=true', async () => {
      const logger = await loadLoggerWithEnv({ DEBUG: 'true' });

      logger.log('startup message', { port: 9154 });

      expect(console.log).toHaveBeenCalledWith('startup message', { port: 9154 });
    });

    it('calls console.log with the given arguments when NODE_ENV=development', async () => {
      const logger = await loadLoggerWithEnv({ NODE_ENV: 'development' });

      logger.log('startup message');

      expect(console.log).toHaveBeenCalledWith('startup message');
    });

    it('does not call console.log when DEBUG is set to a non-"true" value', async () => {
      const logger = await loadLoggerWithEnv({ DEBUG: '1' });

      logger.log('startup message');

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('calls console.warn with the given arguments regardless of DEBUG', async () => {
      const logger = await loadLoggerWithEnv({});

      logger.warn('service degraded', { service: 'phoenixd' });

      expect(console.warn).toHaveBeenCalledWith('service degraded', { service: 'phoenixd' });
    });
  });

  describe('error', () => {
    it('calls console.error with the given arguments regardless of DEBUG', async () => {
      const logger = await loadLoggerWithEnv({});

      logger.error('startup failed', new Error('port in use'));

      expect(console.error).toHaveBeenCalledWith('startup failed', new Error('port in use'));
    });
  });
});
