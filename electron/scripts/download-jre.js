import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { DOWNLOAD } from '../utils/constants.js';

import { downloadFile, findSingleExtractedDirectory, moveChildrenUp, flattenSingleNestedDirectory } from './download-utils.js';
import { getBuildPlatform } from './platform-utils.js';
import { verifySha256, fetchAdoptiumChecksum } from './verify-checksum.js';

const RESOURCES_DIRECTORY = path.join(import.meta.dirname, '..', 'resources', 'jre');

const JRE_VERSION = DOWNLOAD.JRE_VERSION;
const ADOPTIUM_ASSETS = `https://api.adoptium.net/v3/assets/latest/${JRE_VERSION}/hotspot`;

const ALL_JRE_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/mac/x64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=x64&image_type=jre&os=mac&project=jdk&vendor=eclipse`,
    filename: 'jre-macos-x64.tar.gz',
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/mac/aarch64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=aarch64&image_type=jre&os=mac&project=jdk&vendor=eclipse`,
    filename: 'jre-macos-arm64.tar.gz',
  },
  'win-x64': {
    platform: 'win-x64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=x64&image_type=jre&os=windows&project=jdk&vendor=eclipse`,
    filename: 'jre-win-x64.zip',
  },
  'win-arm64': {
    platform: 'win-arm64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/windows/aarch64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=aarch64&image_type=jre&os=windows&project=jdk&vendor=eclipse`,
    filename: 'jre-win-arm64.zip',
  },
  'linux-x64': {
    platform: 'linux-x64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/linux/x64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=x64&image_type=jre&os=linux&project=jdk&vendor=eclipse`,
    filename: 'jre-linux-x64.tar.gz',
  },
  'linux-arm64': {
    platform: 'linux-arm64',
    downloadUrl: `https://api.adoptium.net/v3/binary/latest/${JRE_VERSION}/ga/linux/aarch64/jre/hotspot/normal/eclipse?project=jdk`,
    checksumApiUrl: `${ADOPTIUM_ASSETS}?architecture=aarch64&image_type=jre&os=linux&project=jdk&vendor=eclipse`,
    filename: 'jre-linux-arm64.tar.gz',
  },
};

const currentPlatform = getBuildPlatform();

let JRE_DOWNLOADS;
if (currentPlatform === 'win-arm64') {
  const nativeBackendJre = ALL_JRE_DOWNLOADS['win-arm64'];
  const emulatedPhoenixdJvmJre = ALL_JRE_DOWNLOADS['win-x64'];
  JRE_DOWNLOADS = [nativeBackendJre, emulatedPhoenixdJvmJre];
} else {
  JRE_DOWNLOADS = [ALL_JRE_DOWNLOADS[currentPlatform]];
}

function extractArchive(archivePath, platform, destinationDirectory) {
  console.log(`Extracting ${archivePath}...`);

  if (!fs.existsSync(destinationDirectory)) {
    fs.mkdirSync(destinationDirectory, { recursive: true });
  }

  try {
    if (archivePath.endsWith('.tar.gz')) {
      execSync(`tar -xzf "${archivePath}" -C "${destinationDirectory}"`, { stdio: 'inherit' });

      const extractedDirectory = findSingleExtractedDirectory(destinationDirectory);

      if (extractedDirectory) {
        let sourceDirectory = extractedDirectory;
        if (platform.startsWith('macos')) {
          const contentsHome = path.join(extractedDirectory, 'Contents', 'Home');
          if (fs.existsSync(contentsHome)) {
            sourceDirectory = contentsHome;
            console.log('Detected macOS JRE structure (Contents/Home), extracting from nested directory...');
          }
        }

        moveChildrenUp(sourceDirectory, destinationDirectory);
        fs.rmSync(extractedDirectory, { recursive: true, force: true });
      }
    } else if (archivePath.endsWith('.zip')) {
      if (process.platform === 'win32') {
        const powershellCommand = `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destinationDirectory}' -Force"`;
        execSync(powershellCommand, { stdio: 'inherit' });
      } else {
        execSync(`unzip -q "${archivePath}" -d "${destinationDirectory}"`, { stdio: 'inherit' });
      }

      flattenSingleNestedDirectory(destinationDirectory);
    }

    console.log(`Extracted to: ${destinationDirectory}\n`);
  } catch (extractionError) {
    console.error(`Error extracting archive: ${extractionError.message}`);
    throw extractionError;
  }
}

async function downloadAndExtractJRE(platform, downloadUrl, checksumApiUrl, filename) {
  const platformDirectory = path.join(RESOURCES_DIRECTORY, platform);
  const downloadPath = path.join(RESOURCES_DIRECTORY, filename);

  if (fs.existsSync(platformDirectory) && fs.readdirSync(platformDirectory).length > 0) {
    console.log(`✓ JRE for ${platform} already exists, skipping download\n`);
    return;
  }

  console.log(`\n=== Downloading JRE for ${platform} ===`);

  if (!fs.existsSync(RESOURCES_DIRECTORY)) {
    fs.mkdirSync(RESOURCES_DIRECTORY, { recursive: true });
  }

  await downloadFile(downloadUrl, downloadPath);

  try {
    console.log(`Fetching checksum from Adoptium API: ${checksumApiUrl}`);
    const expectedHash = await fetchAdoptiumChecksum(checksumApiUrl);
    await verifySha256(downloadPath, expectedHash);
  } catch (checksumError) {
    fs.unlinkSync(downloadPath);
    throw new Error(`Integrity check failed: ${checksumError.message}`);
  }

  extractArchive(downloadPath, platform, platformDirectory);

  const javaExecutable = platform.startsWith('win') ? 'java.exe' : 'java';
  const javaPath = path.join(platformDirectory, 'bin', javaExecutable);

  if (fs.existsSync(javaPath)) {
    console.log(`✓ Successfully installed JRE for ${platform}`);
    if (!platform.startsWith('win')) {
      fs.chmodSync(javaPath, 0o755);
    }
  } else {
    throw new Error(`Java executable not found at ${javaPath}`);
  }

  fs.unlinkSync(downloadPath);
}

async function main() {
  console.log('===========================================');
  console.log(`  Downloading JRE ${DOWNLOAD.JRE_VERSION} for ${currentPlatform}`);
  console.log('===========================================\n');

  await Promise.all(
    JRE_DOWNLOADS.map(async (jreDownload) => {
      try {
        await downloadAndExtractJRE(jreDownload.platform, jreDownload.downloadUrl, jreDownload.checksumApiUrl, jreDownload.filename);
      } catch (jreInstallError) {
        console.error(`Failed to download JRE for ${jreDownload.platform}:`, jreInstallError);
        process.exit(1);
      }
    }),
  );

  console.log('\n===========================================');
  console.log(`  ✓ JRE download for ${currentPlatform} complete!`);
  console.log('===========================================');
  process.exit(0);
}

main().catch((fatalError) => {
  console.error('Fatal error:', fatalError);
  process.exit(1);
});
