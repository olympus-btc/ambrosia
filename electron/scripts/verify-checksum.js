import crypto from 'crypto';
import fs from 'fs';
import https from 'https';

export function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function verifySha256(filePath, expectedHash) {
  const actualHash = await computeSha256(filePath);
  if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error(
      `Checksum mismatch!\n  File:     ${filePath}\n  Expected: ${expectedHash}\n  Got:      ${actualHash}\n  The downloaded file may be corrupted or tampered with.`,
    );
  }
  console.log(`✓ Checksum verified: ${filePath}`);
}

function fetchSha256SumsText(url) {
  return new Promise((resolve, reject) => {
    const sha256sumsRequest = https.get(url, (sha256sumsResponse) => {
      if (sha256sumsResponse.statusCode === 301 || sha256sumsResponse.statusCode === 302 ||
          sha256sumsResponse.statusCode === 307 || sha256sumsResponse.statusCode === 308) {
        fetchSha256SumsText(sha256sumsResponse.headers.location).then(resolve).catch(reject);
        return;
      }
      if (sha256sumsResponse.statusCode !== 200) {
        reject(new Error(`HTTP ${sha256sumsResponse.statusCode} fetching ${url}`));
        return;
      }
      let sha256sumsText = '';
      sha256sumsResponse.on('data', (chunk) => { sha256sumsText += chunk; });
      sha256sumsResponse.on('end', () => resolve(sha256sumsText.trim()));
    });
    sha256sumsRequest.on('error', reject);
  });
}

function fetchAdoptiumReleases(assetsApiUrl) {
  return new Promise((resolve, reject) => {
    const adoptiumRequest = https.get(assetsApiUrl, { headers: { Accept: 'application/json' } }, (adoptiumResponse) => {
      if (adoptiumResponse.statusCode === 301 || adoptiumResponse.statusCode === 302 ||
          adoptiumResponse.statusCode === 307 || adoptiumResponse.statusCode === 308) {
        fetchAdoptiumReleases(adoptiumResponse.headers.location).then(resolve).catch(reject);
        return;
      }
      if (adoptiumResponse.statusCode !== 200) {
        reject(new Error(`HTTP ${adoptiumResponse.statusCode} fetching ${assetsApiUrl}`));
        return;
      }
      let adoptiumJson = '';
      adoptiumResponse.on('data', (chunk) => { adoptiumJson += chunk; });
      adoptiumResponse.on('end', () => {
        try { resolve(JSON.parse(adoptiumJson)); } catch (jsonParseError) { reject(jsonParseError); }
      });
    });
    adoptiumRequest.on('error', reject);
  });
}

export async function fetchAdoptiumChecksum(assetsApiUrl) {
  const releases = await fetchAdoptiumReleases(assetsApiUrl);
  if (!Array.isArray(releases) || releases.length === 0) {
    throw new Error(`Adoptium API returned no releases from ${assetsApiUrl}`);
  }
  const checksum = releases[0].binary && releases[0].binary.package && releases[0].binary.package.checksum;
  if (!checksum) {
    throw new Error(`No checksum found in Adoptium API response from ${assetsApiUrl}`);
  }
  return checksum.toLowerCase();
}

export async function fetchSha256SumsChecksum(sha256sumsUrl, filename) {
  const sha256sumsContent = await fetchSha256SumsText(sha256sumsUrl);
  for (const sha256sumsLine of sha256sumsContent.split('\n')) {
    const trimmedLine = sha256sumsLine.trim();
    if (trimmedLine.endsWith(filename) || trimmedLine.endsWith(`*${filename}`)) {
      return trimmedLine.split(/\s+/)[0].toLowerCase();
    }
  }
  throw new Error(`No entry for "${filename}" found in ${sha256sumsUrl}`);
}
