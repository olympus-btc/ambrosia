const http = require('http');

const waitOn = require('wait-on');

const logger = require('./logger');

async function waitForHealth(url, options = {}) {
  const {
    timeout = 60000,
    interval = 1000,
    verbose = true,
    acceptUnauthorized = false,
  } = options;

  const waitOptions = {
    resources: [url],
    timeout,
    interval,
    verbose,
    validateStatus: (status) => {
      if (status >= 200 && status < 300) return true;
      if (acceptUnauthorized && status === 401) return true;
      return false;
    },
  };

  try {
    logger.log(`[HealthCheck] Waiting for ${url} to be healthy...`);
    await waitOn(waitOptions);
    logger.log(`[HealthCheck] ${url} is healthy`);
    return true;
  } catch (error) {
    logger.error(`[HealthCheck] ${url} failed health check:`, error.message);
    throw error;
  }
}

async function checkService({ url, name, isHealthy, maxAttempts = 60, intervalMs = 1000 }) {
  logger.log(`[HealthCheck] Checking ${name} at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (isHealthy(res.statusCode)) {
            logger.log(`[HealthCheck] ${name} is healthy (status: ${res.statusCode})`);
            resolve();
          } else {
            reject(new Error(`Unexpected status code: ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        logger.error(`[HealthCheck] ${name} health check failed after ${maxAttempts} attempts:`, error.message);
        throw new Error(`Timed out waiting for: ${url}`);
      }
      if (attempt % 10 === 0) {
        logger.log(`[HealthCheck] Still waiting for ${name}... (attempt ${attempt}/${maxAttempts})`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

async function checkPhoenixd(port, maxAttempts = 60, intervalMs = 1000) {
  return checkService({
    url: `http://localhost:${port}/getinfo`,
    name: 'Phoenixd',
    isHealthy: (status) => status === 401 || (status >= 200 && status < 300),
    maxAttempts,
    intervalMs,
  });
}

async function checkBackend(port, maxAttempts = 60, intervalMs = 1000) {
  return checkService({
    url: `http://localhost:${port}/api/health`,
    name: 'Backend',
    isHealthy: (status) => status >= 200 && status < 300,
    maxAttempts,
    intervalMs,
  });
}

async function checkNextJs(port, maxAttempts = 60, intervalMs = 1000) {
  return checkService({
    url: `http://localhost:${port}/`,
    name: 'Next.js',
    isHealthy: (status) => status >= 200 && status < 400,
    maxAttempts,
    intervalMs,
  });
}

async function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function singleCheck(url, isHealthy, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume(); // M2: consume response body
      resolve(isHealthy(res.statusCode));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
  });
}

async function isPhoenixdRunning(port) {
  return singleCheck(
    `http://localhost:${port}/getinfo`,
    (status) => status === 401 || (status >= 200 && status < 300),
  );
}

async function isBackendRunning(port) {
  return singleCheck(`http://localhost:${port}/`, () => true);
}

async function isNextJsRunning(port) {
  return singleCheck(
    `http://localhost:${port}/`,
    (status) => status >= 200 && status < 400,
  );
}

module.exports = {
  waitForHealth,
  checkPhoenixd,
  checkBackend,
  checkNextJs,
  makeHttpRequest,
  isPhoenixdRunning,
  isBackendRunning,
  isNextJsRunning,
};
