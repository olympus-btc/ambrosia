const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const { getBuildPlatform } = require('./platform-utils');

const NODE_VERSION = 'v20.11.0'; // LTS version compatible with Next.js 16
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'node');

const ALL_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-x64.tar.gz`,
    filename: `node-${NODE_VERSION}-darwin-x64.tar.gz`,
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    filename: `node-${NODE_VERSION}-darwin-arm64.tar.gz`,
  },
  'win-x64': {
    platform: 'win-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
    filename: `node-${NODE_VERSION}-win-x64.zip`,
  },
  'win-arm64': {
    platform: 'win-arm64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-arm64.zip`,
    filename: `node-${NODE_VERSION}-win-arm64.zip`,
  },
  'linux-x64': {
    platform: 'linux-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
    filename: `node-${NODE_VERSION}-linux-x64.tar.gz`,
  },
  'linux-arm64': {
    platform: 'linux-arm64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-arm64.tar.gz`,
    filename: `node-${NODE_VERSION}-linux-arm64.tar.gz`,
  },
};

const currentPlatform = getBuildPlatform();
const DOWNLOADS = [ALL_DOWNLOADS[currentPlatform]];

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    const file = fs.createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`  ${percent}%`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('✓ Download complete\n');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

function extractArchive(archivePath, platform, destDir) {
  console.log(`Extracting: ${path.basename(archivePath)}`);

  if (platform.startsWith('win')) {
    // Windows - use PowerShell for zip extraction
    const psCommand = `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`;
    execSync(psCommand, { stdio: 'inherit' });

    // Move files from nested directory
    const extractedDir = path.join(destDir, path.basename(archivePath, '.zip'));
    const files = fs.readdirSync(extractedDir);
    files.forEach((file) => {
      fs.renameSync(
        path.join(extractedDir, file),
        path.join(destDir, file),
      );
    });
    fs.rmSync(extractedDir, { recursive: true, force: true });
  } else {
    // macOS/Linux - use tar
    execSync(`tar -xzf "${archivePath}" -C "${destDir}" --strip-components=1`, { stdio: 'inherit' });
  }

  console.log('✓ Extraction complete\n');
}

async function main() {
  console.log('===========================================');
  console.log('  Downloading Node.js Binary');
  console.log('===========================================');
  console.log(`Platform: ${currentPlatform}\n`);

  // Create resources directory
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }

  for (const download of DOWNLOADS) {
    const platformDir = path.join(RESOURCES_DIR, download.platform);
    const archivePath = path.join(RESOURCES_DIR, download.filename);

    // Check if already downloaded
    const nodeBinary = download.platform.startsWith('win')
      ? path.join(platformDir, 'node.exe')
      : path.join(platformDir, 'bin', 'node');

    if (fs.existsSync(nodeBinary)) {
      console.log(`✓ Node.js ${download.platform} already exists, skipping...\n`);
      continue;
    }

    console.log(`Processing: ${download.platform}`);

    // Download
    await downloadFile(download.url, archivePath);

    // Create platform directory
    if (!fs.existsSync(platformDir)) {
      fs.mkdirSync(platformDir, { recursive: true });
    }

    // Extract
    extractArchive(archivePath, download.platform, platformDir);

    // Clean up archive
    fs.unlinkSync(archivePath);

    // Verify
    if (fs.existsSync(nodeBinary)) {
      console.log(`✓ Node.js ${download.platform} installed successfully\n`);
    } else {
      throw new Error(`Failed to extract Node.js for ${download.platform}`);
    }
  }

  console.log('===========================================');
  console.log(`  ✓ Node.js binary for ${currentPlatform} downloaded!`);
  console.log('===========================================');
}

main().catch((error) => {
  console.error('\n✗ Error:', error.message);
  process.exit(1);
});
