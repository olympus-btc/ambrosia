const { EventEmitter } = require('events');
const http = require('http');

const { waitOnMock } = vi.hoisted(() => ({
  waitOnMock: vi.fn(),
}));

vi.mock('wait-on', () => ({
  default: waitOnMock,
}));

let healthCheck;
let logger;

beforeAll(async () => {
  ({ healthCheck } = await import('../healthCheck.js'));
  ({ logger } = await import('../logger.js'));
});

function createFakeIncomingMessage(statusCode) {
  const incomingMessage = new EventEmitter();
  incomingMessage.statusCode = statusCode;
  incomingMessage.resume = () => {};
  return incomingMessage;
}

function createFakeClientRequest() {
  const clientRequest = new EventEmitter();
  clientRequest.setTimeout = vi.fn();
  clientRequest.destroy = vi.fn();
  return clientRequest;
}

function mockHttpGetRespondingWith(statusCode) {
  vi.spyOn(http, 'get').mockImplementation((_url, callback) => {
    callback(createFakeIncomingMessage(statusCode));
    return createFakeClientRequest();
  });
}

function mockHttpGetFailingWith(requestError) {
  vi.spyOn(http, 'get').mockImplementation(() => {
    const clientRequest = createFakeClientRequest();
    setImmediate(() => clientRequest.emit('error', requestError));
    return clientRequest;
  });
}

beforeEach(() => {
  waitOnMock.mockReset();
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('waitForHealth', () => {
  it('resolves true when waitOn succeeds', async () => {
    waitOnMock.mockResolvedValue(undefined);

    await expect(healthCheck.waitForHealth('http://localhost:9154/health')).resolves.toBe(true);
  });

  it('passes the url as the single resource, with the given timeout/interval/verbose', async () => {
    waitOnMock.mockResolvedValue(undefined);

    await healthCheck.waitForHealth('http://localhost:9154/health', { timeout: 5000, interval: 200, verbose: false });

    expect(waitOnMock).toHaveBeenCalledWith(expect.objectContaining({
      resources: ['http://localhost:9154/health'],
      timeout: 5000,
      interval: 200,
      verbose: false,
    }));
  });

  it('validates 2xx statuses as healthy', async () => {
    waitOnMock.mockResolvedValue(undefined);

    await healthCheck.waitForHealth('http://localhost:9154/health');
    const { validateStatus } = waitOnMock.mock.calls[0][0];

    expect(validateStatus(200)).toBe(true);
    expect(validateStatus(299)).toBe(true);
  });

  it('rejects a 401 status by default', async () => {
    waitOnMock.mockResolvedValue(undefined);

    await healthCheck.waitForHealth('http://localhost:9154/health');
    const { validateStatus } = waitOnMock.mock.calls[0][0];

    expect(validateStatus(401)).toBe(false);
  });

  it('accepts a 401 status when acceptUnauthorized is true', async () => {
    waitOnMock.mockResolvedValue(undefined);

    await healthCheck.waitForHealth('http://localhost:9154/health', { acceptUnauthorized: true });
    const { validateStatus } = waitOnMock.mock.calls[0][0];

    expect(validateStatus(401)).toBe(true);
  });

  it('rejects and logs when waitOn fails', async () => {
    waitOnMock.mockRejectedValue(new Error('timed out'));

    await expect(healthCheck.waitForHealth('http://localhost:9154/health')).rejects.toThrow('timed out');
    expect(logger.error).toHaveBeenCalledWith(
      '[HealthCheck] http://localhost:9154/health failed health check:',
      'timed out',
    );
  });
});

describe('checkPhoenixd', () => {
  it('resolves true immediately when the response is healthy', async () => {
    mockHttpGetRespondingWith(200);

    await expect(healthCheck.checkPhoenixd(9740)).resolves.toBe(true);
  });

  it('treats a 401 response as healthy', async () => {
    mockHttpGetRespondingWith(401);

    await expect(healthCheck.checkPhoenixd(9740)).resolves.toBe(true);
  });

  it('retries after an unhealthy response and eventually succeeds', async () => {
    let attemptCount = 0;
    vi.spyOn(http, 'get').mockImplementation((_url, callback) => {
      attemptCount += 1;
      callback(createFakeIncomingMessage(attemptCount < 2 ? 503 : 200));
      return createFakeClientRequest();
    });

    await expect(healthCheck.checkPhoenixd(9740, 3, 1)).resolves.toBe(true);
    expect(attemptCount).toBe(2);
  });

  it('throws a timeout error after exhausting all attempts', async () => {
    mockHttpGetRespondingWith(503);

    await expect(healthCheck.checkPhoenixd(9740, 2, 1))
      .rejects.toThrow('Timed out waiting for: http://localhost:9740/getinfo');
  });

  it('retries when the request errors out', async () => {
    let attemptCount = 0;
    vi.spyOn(http, 'get').mockImplementation((_url, callback) => {
      attemptCount += 1;
      if (attemptCount < 2) {
        const clientRequest = createFakeClientRequest();
        setImmediate(() => clientRequest.emit('error', new Error('ECONNREFUSED')));
        return clientRequest;
      }
      callback(createFakeIncomingMessage(200));
      return createFakeClientRequest();
    });

    await expect(healthCheck.checkPhoenixd(9740, 3, 1)).resolves.toBe(true);
  });
});

describe('checkBackend', () => {
  it('resolves true for a 2xx response', async () => {
    mockHttpGetRespondingWith(200);

    await expect(healthCheck.checkBackend(9154)).resolves.toBe(true);
  });

  it('does not treat a 401 response as healthy', async () => {
    mockHttpGetRespondingWith(401);

    await expect(healthCheck.checkBackend(9154, 1, 1))
      .rejects.toThrow('Timed out waiting for: http://localhost:9154/api/health');
  });
});

describe('checkNextJs', () => {
  it('resolves true for a 2xx response', async () => {
    mockHttpGetRespondingWith(200);

    await expect(healthCheck.checkNextJs(3000)).resolves.toBe(true);
  });

  it('treats a 3xx redirect as healthy', async () => {
    mockHttpGetRespondingWith(302);

    await expect(healthCheck.checkNextJs(3000)).resolves.toBe(true);
  });

  it('does not treat a 4xx response as healthy', async () => {
    mockHttpGetRespondingWith(404);

    await expect(healthCheck.checkNextJs(3000, 1, 1))
      .rejects.toThrow('Timed out waiting for: http://localhost:3000/');
  });
});

describe('makeHttpRequest', () => {
  it('resolves with the status code and accumulated body on a 2xx response', async () => {
    vi.spyOn(http, 'get').mockImplementation((_url, callback) => {
      const incomingMessage = createFakeIncomingMessage(200);
      callback(incomingMessage);
      incomingMessage.emit('data', 'chunk-1');
      incomingMessage.emit('data', 'chunk-2');
      incomingMessage.emit('end');
      return createFakeClientRequest();
    });

    await expect(healthCheck.makeHttpRequest('http://localhost:9154/api/data')).resolves.toEqual({
      statusCode: 200,
      responseBody: 'chunk-1chunk-2',
    });
  });

  it('rejects with the status code and body on a non-2xx response', async () => {
    vi.spyOn(http, 'get').mockImplementation((_url, callback) => {
      const incomingMessage = createFakeIncomingMessage(500);
      callback(incomingMessage);
      incomingMessage.emit('data', 'internal error');
      incomingMessage.emit('end');
      return createFakeClientRequest();
    });

    await expect(healthCheck.makeHttpRequest('http://localhost:9154/api/data')).rejects.toThrow('HTTP 500: internal error');
  });

  it('rejects when the request errors out', async () => {
    mockHttpGetFailingWith(new Error('ECONNREFUSED'));

    await expect(healthCheck.makeHttpRequest('http://localhost:9154/api/data')).rejects.toThrow('ECONNREFUSED');
  });
});

describe('isPhoenixdRunning', () => {
  it('returns true for a healthy response', async () => {
    mockHttpGetRespondingWith(200);

    await expect(healthCheck.isPhoenixdRunning(9740)).resolves.toBe(true);
  });

  it('returns true for a 401 response', async () => {
    mockHttpGetRespondingWith(401);

    await expect(healthCheck.isPhoenixdRunning(9740)).resolves.toBe(true);
  });

  it('returns false for an unhealthy response', async () => {
    mockHttpGetRespondingWith(503);

    await expect(healthCheck.isPhoenixdRunning(9740)).resolves.toBe(false);
  });

  it('returns false when the request errors out', async () => {
    mockHttpGetFailingWith(new Error('ECONNREFUSED'));

    await expect(healthCheck.isPhoenixdRunning(9740)).resolves.toBe(false);
  });
});

describe('isBackendRunning', () => {
  it('returns true for any response status', async () => {
    mockHttpGetRespondingWith(500);

    await expect(healthCheck.isBackendRunning(9154)).resolves.toBe(true);
  });

  it('returns false when the request errors out', async () => {
    mockHttpGetFailingWith(new Error('ECONNREFUSED'));

    await expect(healthCheck.isBackendRunning(9154)).resolves.toBe(false);
  });
});

describe('isNextJsRunning', () => {
  it('returns true for a 2xx response', async () => {
    mockHttpGetRespondingWith(200);

    await expect(healthCheck.isNextJsRunning(3000)).resolves.toBe(true);
  });

  it('returns false for a 4xx response', async () => {
    mockHttpGetRespondingWith(404);

    await expect(healthCheck.isNextJsRunning(3000)).resolves.toBe(false);
  });
});
