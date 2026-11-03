import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { DOWNLOAD } from '../utils/constants.js';

import { downloadFile, flattenSingleNestedDirectory } from './download-utils.js';
import { getBuildPlatform } from './platform-utils.js';
import { verifySha256, fetchSha256SumsChecksum } from './verify-checksum.js';

const PHOENIXD_VERSION = DOWNLOAD.PHOENIXD_VERSION;
const RESOURCES_DIRECTORY = path.join(import.meta.dirname, '..', 'resources', 'phoenixd');

const GITHUB_BASE = `https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}`;

const SHA256SUMS_URL = `${GITHUB_BASE}/SHA256SUMS.asc`;

const ALL_PHOENIXD_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-macos-x64.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-macos-x64.zip`,
    localFilename: 'phoenixd-macos-x64.zip',
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-macos-arm64.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-macos-arm64.zip`,
    localFilename: 'phoenixd-macos-arm64.zip',
  },
  'win-x64': {
    platform: 'win-x64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-jvm.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-jvm.zip`,
    localFilename: 'phoenixd-win-x64.zip',
  },
  'win-arm64': {
    platform: 'win-arm64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-jvm.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-jvm.zip`,
    localFilename: 'phoenixd-win-arm64.zip',
  },
  'linux-x64': {
    platform: 'linux-x64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-linux-x64.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-linux-x64.zip`,
    localFilename: 'phoenixd-linux-x64.zip',
  },
  'linux-arm64': {
    platform: 'linux-arm64',
    downloadUrl: `${GITHUB_BASE}/phoenixd-${PHOENIXD_VERSION}-linux-arm64.zip`,
    archiveFilename: `phoenixd-${PHOENIXD_VERSION}-linux-arm64.zip`,
    localFilename: 'phoenixd-linux-arm64.zip',
  },
};

const currentPlatform = getBuildPlatform();
const PHOENIXD_DOWNLOADS = [ALL_PHOENIXD_DOWNLOADS[currentPlatform]];

function extractZip(zipPath, destinationDirectory) {
  console.log(`Extracting ${zipPath}...`);

  if (!fs.existsSync(destinationDirectory)) {
    fs.mkdirSync(destinationDirectory, { recursive: true });
  }

  try {
    if (process.platform === 'win32') {
      const powershellCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destinationDirectory}' -Force"`;
      execSync(powershellCommand, { stdio: 'inherit' });
    } else {
      execSync(`unzip -q "${zipPath}" -d "${destinationDirectory}"`, { stdio: 'inherit' });
    }

    flattenSingleNestedDirectory(destinationDirectory);

    console.log(`Extracted to: ${destinationDirectory}\n`);
  } catch (extractionError) {
    console.error(`Error extracting archive: ${extractionError.message}`);
    throw extractionError;
  }
}

async function downloadAndExtractPhoenixd(platform, downloadUrl, archiveFilename, localFilename) {
  const platformDirectory = path.join(RESOURCES_DIRECTORY, platform);
  const downloadPath = path.join(RESOURCES_DIRECTORY, localFilename);

  const isJvmVersion = downloadUrl.includes('jvm');
  let phoenixdExecutable;
  if (isJvmVersion) {
    phoenixdExecutable = path.join('bin', 'phoenixd.bat');
  } else if (platform.startsWith('win')) {
    phoenixdExecutable = 'phoenixd.exe';
  } else {
    phoenixdExecutable = 'phoenixd';
  }
  const phoenixdPath = path.join(platformDirectory, phoenixdExecutable);

  if (fs.existsSync(phoenixdPath)) {
    console.log(`✓ Phoenixd for ${platform} already exists, skipping download\n`);
    return;
  }

  console.log(`\n=== Downloading Phoenixd for ${platform} ===`);

  if (!fs.existsSync(RESOURCES_DIRECTORY)) {
    fs.mkdirSync(RESOURCES_DIRECTORY, { recursive: true });
  }

  await downloadFile(downloadUrl, downloadPath);

  try {
    console.log(`Fetching checksums from: ${SHA256SUMS_URL}`);
    const expectedHash = await fetchSha256SumsChecksum(SHA256SUMS_URL, archiveFilename);
    await verifySha256(downloadPath, expectedHash);
  } catch (checksumError) {
    fs.unlinkSync(downloadPath);
    throw new Error(`Integrity check failed: ${checksumError.message}`);
  }

  extractZip(downloadPath, platformDirectory);

  if (fs.existsSync(phoenixdPath)) {
    console.log(`✓ Successfully installed Phoenixd for ${platform}`);
    if (!platform.startsWith('win')) {
      fs.chmodSync(phoenixdPath, 0o755);
    }
  } else {
    throw new Error(`Phoenixd executable not found at ${phoenixdPath}`);
  }

  fs.unlinkSync(downloadPath);
}

async function main() {
  console.log('===========================================');
  console.log(`  Downloading Phoenixd ${PHOENIXD_VERSION} for ${currentPlatform}`);
  console.log('===========================================\n');

  await Promise.all(
    PHOENIXD_DOWNLOADS.map(async (phoenixdDownload) => {
      try {
        await downloadAndExtractPhoenixd(phoenixdDownload.platform, phoenixdDownload.downloadUrl, phoenixdDownload.archiveFilename, phoenixdDownload.localFilename);
      } catch (phoenixdInstallError) {
        console.error(`Failed to download Phoenixd for ${phoenixdDownload.platform}:`, phoenixdInstallError);
        process.exit(1);
      }
    }),
  );

  console.log('\n===========================================');
  console.log(`  ✓ Phoenixd download for ${currentPlatform} complete!`);
  console.log('===========================================');
  process.exit(0);
}

main().catch((fatalError) => {
  console.error('Fatal error:', fatalError);
  process.exit(1);
});
