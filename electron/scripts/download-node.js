import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { downloadFile, flattenSingleNestedDirectory } from './download-utils.js';
import { getBuildPlatform } from './platform-utils.js';
import { verifySha256, fetchSha256SumsChecksum } from './verify-checksum.js';

const NODE_VERSION = 'v24.15.0';
const RESOURCES_DIRECTORY = path.join(import.meta.dirname, '..', 'resources', 'node');

const SHASUMS_URL = `https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt`;

const ALL_NODE_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-x64.tar.gz`,
    filename: `node-${NODE_VERSION}-darwin-x64.tar.gz`,
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    filename: `node-${NODE_VERSION}-darwin-arm64.tar.gz`,
  },
  'win-x64': {
    platform: 'win-x64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
    filename: `node-${NODE_VERSION}-win-x64.zip`,
  },
  'win-arm64': {
    platform: 'win-arm64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-arm64.zip`,
    filename: `node-${NODE_VERSION}-win-arm64.zip`,
  },
  'linux-x64': {
    platform: 'linux-x64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
    filename: `node-${NODE_VERSION}-linux-x64.tar.gz`,
  },
  'linux-arm64': {
    platform: 'linux-arm64',
    downloadUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-arm64.tar.gz`,
    filename: `node-${NODE_VERSION}-linux-arm64.tar.gz`,
  },
};

const currentPlatform = getBuildPlatform();
const NODE_DOWNLOADS = [ALL_NODE_DOWNLOADS[currentPlatform]];

function extractArchive(archivePath, platform, destinationDirectory) {
  console.log(`Extracting ${archivePath}...`);

  if (!fs.existsSync(destinationDirectory)) {
    fs.mkdirSync(destinationDirectory, { recursive: true });
  }

  try {
    if (platform.startsWith('win')) {
      const powershellCommand = `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destinationDirectory}' -Force"`;
      execSync(powershellCommand, { stdio: 'inherit' });
      flattenSingleNestedDirectory(destinationDirectory);
    } else {
      execSync(`tar -xzf "${archivePath}" -C "${destinationDirectory}" --strip-components=1`, { stdio: 'inherit' });
    }

    console.log(`Extracted to: ${destinationDirectory}\n`);
  } catch (extractionError) {
    console.error(`Error extracting archive: ${extractionError.message}`);
    throw extractionError;
  }
}

async function downloadAndExtractNode(platform, downloadUrl, filename) {
  const platformDirectory = path.join(RESOURCES_DIRECTORY, platform);
  const archivePath = path.join(RESOURCES_DIRECTORY, filename);

  const nodeBinary = platform.startsWith('win')
    ? path.join(platformDirectory, 'node.exe')
    : path.join(platformDirectory, 'bin', 'node');

  if (fs.existsSync(nodeBinary)) {
    console.log(`✓ Node.js ${platform} already exists, skipping...\n`);
    return;
  }

  console.log(`\n=== Downloading Node.js for ${platform} ===`);

  if (!fs.existsSync(RESOURCES_DIRECTORY)) {
    fs.mkdirSync(RESOURCES_DIRECTORY, { recursive: true });
  }

  await downloadFile(downloadUrl, archivePath);

  try {
    console.log(`Fetching checksums from: ${SHASUMS_URL}`);
    const expectedHash = await fetchSha256SumsChecksum(SHASUMS_URL, filename);
    await verifySha256(archivePath, expectedHash);
  } catch (checksumError) {
    fs.unlinkSync(archivePath);
    throw new Error(`Integrity check failed: ${checksumError.message}`);
  }

  extractArchive(archivePath, platform, platformDirectory);

  if (fs.existsSync(nodeBinary)) {
    console.log(`✓ Node.js ${platform} installed successfully\n`);
  } else {
    throw new Error(`Failed to extract Node.js for ${platform}`);
  }

  fs.unlinkSync(archivePath);
}

async function main() {
  console.log('===========================================');
  console.log(`  Downloading Node.js ${NODE_VERSION} for ${currentPlatform}`);
  console.log('===========================================\n');

  await Promise.all(
    NODE_DOWNLOADS.map(async (nodeDownload) => {
      try {
        await downloadAndExtractNode(nodeDownload.platform, nodeDownload.downloadUrl, nodeDownload.filename);
      } catch (nodeInstallError) {
        console.error(`Failed to download Node.js for ${nodeDownload.platform}:`, nodeInstallError);
        process.exit(1);
      }
    }),
  );

  console.log('\n===========================================');
  console.log(`  ✓ Node.js binary for ${currentPlatform} downloaded!`);
  console.log('===========================================');
  process.exit(0);
}

main().catch((fatalError) => {
  console.error('Fatal error:', fatalError);
  process.exit(1);
});
