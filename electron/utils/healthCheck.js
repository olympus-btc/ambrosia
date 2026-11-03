import http from 'http';

import waitOn from 'wait-on';

import { HEALTH } from './constants.js';
import { logger } from './logger.js';

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
    validateStatus: (statusCode) => {
      if (statusCode >= 200 && statusCode < 300) return true;
      if (acceptUnauthorized && statusCode === 401) return true;
      return false;
    },
  };

  try {
    logger.log(`[HealthCheck] Waiting for ${url} to be healthy...`);
    await waitOn(waitOptions);
    logger.log(`[HealthCheck] ${url} is healthy`);
    return true;
  } catch (waitError) {
    logger.error(`[HealthCheck] ${url} failed health check:`, waitError.message);
    throw waitError;
  }
}

async function checkService({ url, serviceName, isHealthy, maxAttempts = HEALTH.MAX_ATTEMPTS, intervalMilliseconds = HEALTH.INTERVAL_MILLISECONDS }) {
  logger.log(`[HealthCheck] Checking ${serviceName} at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const healthCheckRequest = http.get(url, (healthCheckResponse) => {
          healthCheckResponse.resume();
          if (isHealthy(healthCheckResponse.statusCode)) {
            logger.log(`[HealthCheck] ${serviceName} is healthy (status: ${healthCheckResponse.statusCode})`);
            resolve();
          } else {
            reject(new Error(`Unexpected status code: ${healthCheckResponse.statusCode}`));
          }
        });

        healthCheckRequest.on('error', reject);
        healthCheckRequest.setTimeout(HEALTH.REQUEST_TIMEOUT_MILLISECONDS, () => {
          healthCheckRequest.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return true;
    } catch (attemptError) {
      if (attempt === maxAttempts) {
        logger.error(`[HealthCheck] ${serviceName} health check failed after ${maxAttempts} attempts:`, attemptError.message);
        throw new Error(`Timed out waiting for: ${url}`);
      }
      if (attempt % HEALTH.LOG_EVERY_N_ATTEMPTS === 0) {
        logger.log(`[HealthCheck] Still waiting for ${serviceName}... (attempt ${attempt}/${maxAttempts})`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMilliseconds));
    }
  }
}

async function checkPhoenixd(port, maxAttempts = HEALTH.MAX_ATTEMPTS, intervalMilliseconds = HEALTH.INTERVAL_MILLISECONDS) {
  return checkService({
    url: `http://localhost:${port}/getinfo`,
    serviceName: 'Phoenixd',
    isHealthy: (statusCode) => statusCode === 401 || (statusCode >= 200 && statusCode < 300),
    maxAttempts,
    intervalMilliseconds,
  });
}

async function checkBackend(port, maxAttempts = HEALTH.MAX_ATTEMPTS, intervalMilliseconds = HEALTH.INTERVAL_MILLISECONDS) {
  return checkService({
    url: `http://localhost:${port}/api/health`,
    serviceName: 'Backend',
    isHealthy: (statusCode) => statusCode >= 200 && statusCode < 300,
    maxAttempts,
    intervalMilliseconds,
  });
}

async function checkNextJs(port, maxAttempts = HEALTH.MAX_ATTEMPTS, intervalMilliseconds = HEALTH.INTERVAL_MILLISECONDS) {
  return checkService({
    url: `http://localhost:${port}/`,
    serviceName: 'Next.js',
    isHealthy: (statusCode) => statusCode >= 200 && statusCode < 400,
    maxAttempts,
    intervalMilliseconds,
  });
}

async function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (httpResponse) => {
      let responseBody = '';
      httpResponse.on('data', (chunk) => { responseBody += chunk; });
      httpResponse.on('end', () => {
        if (httpResponse.statusCode >= 200 && httpResponse.statusCode < 300) {
          resolve({ statusCode: httpResponse.statusCode, responseBody });
        } else {
          reject(new Error(`HTTP ${httpResponse.statusCode}: ${responseBody}`));
        }
      });
    }).on('error', reject);
  });
}

function singleCheck(url, isHealthy, timeoutMilliseconds = HEALTH.SINGLE_CHECK_TIMEOUT_MILLISECONDS) {
  return new Promise((resolve) => {
    const healthCheckRequest = http.get(url, (healthCheckResponse) => {
      healthCheckResponse.resume();
      resolve(isHealthy(healthCheckResponse.statusCode));
    });
    healthCheckRequest.on('error', () => resolve(false));
    healthCheckRequest.setTimeout(timeoutMilliseconds, () => { healthCheckRequest.destroy(); resolve(false); });
  });
}

async function isPhoenixdRunning(port) {
  return singleCheck(
    `http://localhost:${port}/getinfo`,
    (statusCode) => statusCode === 401 || (statusCode >= 200 && statusCode < 300),
  );
}

async function isBackendRunning(port) {
  return singleCheck(`http://localhost:${port}/`, () => true);
}

async function isNextJsRunning(port) {
  return singleCheck(
    `http://localhost:${port}/`,
    (statusCode) => statusCode >= 200 && statusCode < 400,
  );
}

export const healthCheck = {
  waitForHealth,
  checkPhoenixd,
  checkBackend,
  checkNextJs,
  makeHttpRequest,
  isPhoenixdRunning,
  isBackendRunning,
  isNextJsRunning,
};
