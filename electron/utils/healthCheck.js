const http = require('http');

const waitOn = require('wait-on');

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
      // Accept 2xx responses as healthy
      // Also accept 401 if acceptUnauthorized is true (service is running, just needs auth)
      if (status >= 200 && status < 300) {
        return true;
      }
      if (acceptUnauthorized && status === 401) {
        return true;
      }
      return false;
    },
  };

  try {
    console.log(`[HealthCheck] Waiting for ${url} to be healthy...`);
    await waitOn(waitOptions);
    console.log(`[HealthCheck] ${url} is healthy`);
    return true;
  } catch (error) {
    console.error(`[HealthCheck] ${url} failed health check:`, error.message);
    throw error;
  }
}

async function checkPhoenixd(port, maxAttempts = 60, intervalMs = 1000) {
  const url = `http://localhost:${port}/getinfo`;

  console.log(`[HealthCheck] Checking phoenixd at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          // Phoenixd requires authentication, so 401 means it's running
          if (res.statusCode === 401 || (res.statusCode >= 200 && res.statusCode < 300)) {
            console.log(`[HealthCheck] Phoenixd is healthy (status: ${res.statusCode})`);
            resolve(true);
          } else {
            reject(new Error(`Unexpected status code: ${res.statusCode}`));
          }
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return response;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[HealthCheck] Phoenixd health check failed after ${maxAttempts} attempts:`, error.message);
        throw new Error(`Timed out waiting for: ${url}`);
      }

      if (attempt % 10 === 0) {
        console.log(`[HealthCheck] Still waiting for phoenixd... (attempt ${attempt}/${maxAttempts})`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

async function checkBackend(port, maxAttempts = 60, intervalMs = 1000) {
  const url = `http://localhost:${port}/api/health`;

  console.log(`[HealthCheck] Checking backend at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[HealthCheck] Backend is healthy (status: ${res.statusCode})`);
            resolve(true);
          } else {
            reject(new Error(`Unexpected status code: ${res.statusCode}`));
          }
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return response;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[HealthCheck] Backend health check failed after ${maxAttempts} attempts:`, error.message);
        throw new Error(`Timed out waiting for: ${url}`);
      }

      if (attempt % 10 === 0) {
        console.log(`[HealthCheck] Still waiting for backend... (attempt ${attempt}/${maxAttempts})`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

async function checkNextJs(port, maxAttempts = 60, intervalMs = 1000) {
  const url = `http://localhost:${port}/`;

  console.log(`[HealthCheck] Checking Next.js at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            console.log(`[HealthCheck] Next.js is healthy (status: ${res.statusCode})`);
            resolve(true);
          } else {
            reject(new Error(`Unexpected status code: ${res.statusCode}`));
          }
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      return response;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[HealthCheck] Next.js health check failed after ${maxAttempts} attempts:`, error.message);
        throw new Error(`Timed out waiting for: ${url}`);
      }

      if (attempt % 10 === 0) {
        console.log(`[HealthCheck] Still waiting for Next.js... (attempt ${attempt}/${maxAttempts})`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

async function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if phoenixd is already running on the specified port (single attempt)
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if phoenixd is running
 */
async function isPhoenixdRunning(port) {
  const url = `http://localhost:${port}/getinfo`;

  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Phoenixd requires authentication, so 401 means it's running
      resolve(res.statusCode === 401 || (res.statusCode >= 200 && res.statusCode < 300));
    });

    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if backend is already running on the specified port (single attempt)
 * Accepts any HTTP response (even 404/401) as indication that a server is running
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if backend is running
 */
async function isBackendRunning(port) {
  // Use a generic endpoint - any HTTP response means server is running
  const url = `http://localhost:${port}/`;

  return new Promise((resolve) => {
    const req = http.get(url, () => {
      // Any HTTP response means the server is running
      // (even 404, 401, 500, etc.)
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if Next.js is already running on the specified port (single attempt)
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if Next.js is running
 */
async function isNextJsRunning(port) {
  const url = `http://localhost:${port}/`;

  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
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
