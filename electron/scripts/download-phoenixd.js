const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const { getBuildPlatform } = require('./platform-utils');

const PHOENIXD_VERSION = '0.7.1';
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'phoenixd');

// Phoenixd GitHub release URLs
const ALL_PHOENIXD_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    url: `https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}/phoenixd-${PHOENIXD_VERSION}-macos-x64.zip`,
    filename: 'phoenixd-macos-x64.zip',
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    url: `https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}/phoenixd-${PHOENIXD_VERSION}-macos-arm64.zip`,
    filename: 'phoenixd-macos-arm64.zip',
  },
  'win-x64': {
    platform: 'win-x64',
    url: `https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}/phoenixd-${PHOENIXD_VERSION}-jvm.zip`,
    filename: 'phoenixd-win-x64.zip',
  },
  'linux-x64': {
    platform: 'linux-x64',
    url: `https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}/phoenixd-${PHOENIXD_VERSION}-linux-x64.zip`,
    filename: 'phoenixd-linux-x64.zip',
  },
};

// Solo descargar para la plataforma actual
const currentPlatform = getBuildPlatform();
const PHOENIXD_DOWNLOADS = [ALL_PHOENIXD_DOWNLOADS[currentPlatform]];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    console.log(`Downloading: ${url}`);
    console.log(`To: ${dest}`);

    const request = https.get(url, (response) => {
      // Handle redirects (301, 302, 307, 308)
      if (response.statusCode === 301 || response.statusCode === 302 ||
          response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        console.log(`Following redirect (${response.statusCode}) to: ${redirectUrl}`);
        file.close();
        fs.unlinkSync(dest);
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Download complete!\n');
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractZip(zipPath, destDir) {
  console.log(`Extracting ${zipPath}...`);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    // Extract zip using platform-appropriate method
    if (process.platform === 'win32') {
      // Use PowerShell Expand-Archive on Windows (available on Windows 10+)
      const psCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
      execSync(psCommand, { stdio: 'inherit' });
    } else {
      // Use unzip on Unix systems
      execSync(`unzip -q "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
    }

    // Find the extracted directory (usually has version number)
    const extractedDirs = fs.readdirSync(destDir).filter((f) => {
      const fullPath = path.join(destDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    if (extractedDirs.length > 0) {
      const extractedDir = path.join(destDir, extractedDirs[0]);
      const files = fs.readdirSync(extractedDir);

      // Move contents up to destDir
      files.forEach((file) => {
        const oldPath = path.join(extractedDir, file);
        const newPath = path.join(destDir, file);
        if (fs.existsSync(newPath)) {
          fs.rmSync(newPath, { recursive: true, force: true });
        }
        fs.renameSync(oldPath, newPath);
      });

      // Remove the extracted directory
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }

    console.log(`Extracted to: ${destDir}\n`);
  } catch (error) {
    console.error(`Error extracting archive: ${error.message}`);
    throw error;
  }
}

async function downloadAndExtractPhoenixd(platform, url, filename) {
  const platformDir = path.join(RESOURCES_DIR, platform);
  const downloadPath = path.join(RESOURCES_DIR, filename);

  // Check if already downloaded
  // JVM version (Windows) has bin/phoenixd.bat structure
  const isJvmVersion = url.includes('jvm');
  const phoenixdExecutable = isJvmVersion ? path.join('bin', 'phoenixd.bat') :
    platform.startsWith('win') ? 'phoenixd.exe' : 'phoenixd';
  const phoenixdPath = path.join(platformDir, phoenixdExecutable);

  if (fs.existsSync(phoenixdPath)) {
    console.log(`✓ Phoenixd for ${platform} already exists, skipping download\n`);
    return;
  }

  console.log(`\n=== Downloading Phoenixd for ${platform} ===`);

  try {
    // Create directories
    if (!fs.existsSync(RESOURCES_DIR)) {
      fs.mkdirSync(RESOURCES_DIR, { recursive: true });
    }

    // Download
    await downloadFile(url, downloadPath);

    // Extract
    extractZip(downloadPath, platformDir);

    // Verify phoenixd exists
    if (fs.existsSync(phoenixdPath)) {
      console.log(`✓ Successfully installed Phoenixd for ${platform}`);
      // Make executable on Unix systems
      if (!platform.startsWith('win')) {
        fs.chmodSync(phoenixdPath, 0o755);
      }
    } else {
      throw new Error(`Phoenixd executable not found at ${phoenixdPath}`);
    }

    // Clean up archive
    fs.unlinkSync(downloadPath);
  } catch (error) {
    console.error(`✗ Failed to download Phoenixd for ${platform}: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('===========================================');
  console.log(`  Downloading Phoenixd ${PHOENIXD_VERSION} for ${currentPlatform}`);
  console.log('===========================================\n');

  for (const phoenixd of PHOENIXD_DOWNLOADS) {
    try {
      await downloadAndExtractPhoenixd(phoenixd.platform, phoenixd.url, phoenixd.filename);
    } catch (error) {
      console.error(`Failed to download Phoenixd for ${phoenixd.platform}:`, error);
      process.exit(1);
    }
  }

  console.log('\n===========================================');
  console.log(`  ✓ Phoenixd download for ${currentPlatform} complete!`);
  console.log('===========================================');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
