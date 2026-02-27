const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

/**
 * Computes the SHA256 hash of a file.
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hex SHA256 hash
 */
function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Verifies a file's SHA256 against an expected hash.
 * Throws if the hashes don't match.
 * @param {string} filePath - Path to the file
 * @param {string} expectedHash - Expected SHA256 hex string
 */
async function verifySha256(filePath, expectedHash) {
  const actual = await computeSha256(filePath);
  if (actual.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error(
      `Checksum mismatch!\n  File:     ${filePath}\n  Expected: ${expectedHash}\n  Got:      ${actual}\n  The downloaded file may be corrupted or tampered with.`,
    );
  }
  console.log(`✓ Checksum verified: ${filePath}`);
}

/**
 * Fetches a text file from a URL and returns its content.
 * Used to download .sha256 companion files from release pages.
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 ||
          response.statusCode === 307 || response.statusCode === 308) {
        fetchText(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} fetching ${url}`));
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data.trim()));
    });
    request.on('error', reject);
  });
}

/**
 * Downloads a .sha256 file from the given URL and extracts the hash.
 * The file format is expected to be "<hash>  <filename>" or just "<hash>".
 * @param {string} sha256Url
 * @returns {Promise<string>} - The SHA256 hex hash
 */
async function fetchRemoteSha256(sha256Url) {
  const content = await fetchText(sha256Url);
  // Handle both "<hash>  <filename>" and plain "<hash>" formats
  return content.split(/\s+/)[0].toLowerCase();
}

/**
 * Fetches JSON from a URL, follows redirects, and returns the parsed object.
 * @param {string} url
 * @returns {Promise<any>}
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { Accept: 'application/json' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 ||
          response.statusCode === 307 || response.statusCode === 308) {
        fetchJson(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} fetching ${url}`));
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    request.on('error', reject);
  });
}

/**
 * Fetches the SHA256 checksum from the Adoptium assets API.
 * URL format: https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=...&image_type=jre&os=...&project=jdk&vendor=eclipse
 * @param {string} assetsApiUrl
 * @returns {Promise<string>} - The SHA256 hex hash
 */
async function fetchAdoptiumChecksum(assetsApiUrl) {
  const releases = await fetchJson(assetsApiUrl);
  if (!Array.isArray(releases) || releases.length === 0) {
    throw new Error(`Adoptium API returned no releases from ${assetsApiUrl}`);
  }
  const checksum = releases[0].binary && releases[0].binary.package && releases[0].binary.package.checksum;
  if (!checksum) {
    throw new Error(`No checksum found in Adoptium API response from ${assetsApiUrl}`);
  }
  return checksum.toLowerCase();
}

/**
 * Fetches a SHA256SUMS.asc file (PGP-signed, as published by ACINQ) and extracts
 * the hash for a specific filename.
 * Format per line: "<hash> *<filename>"
 * @param {string} sha256sumsUrl - URL of the SHA256SUMS.asc file
 * @param {string} filename - The filename to look up (e.g. "phoenixd-0.7.2-macos-arm64.zip")
 * @returns {Promise<string>} - The SHA256 hex hash
 */
async function fetchSha256SumsChecksum(sha256sumsUrl, filename) {
  const content = await fetchText(sha256sumsUrl);
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.endsWith(filename) || trimmed.endsWith(`*${filename}`)) {
      return trimmed.split(/\s+/)[0].toLowerCase();
    }
  }
  throw new Error(`No entry for "${filename}" found in ${sha256sumsUrl}`);
}

module.exports = { computeSha256, verifySha256, fetchRemoteSha256, fetchAdoptiumChecksum, fetchSha256SumsChecksum };
