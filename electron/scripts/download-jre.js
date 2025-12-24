const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const { getBuildPlatform } = require('./platform-utils');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'jre');

// Adoptium Temurin JRE download URLs
const ALL_JRE_DOWNLOADS = {
  'macos-x64': {
    platform: 'macos-x64',
    url: 'https://api.adoptium.net/v3/binary/latest/21/ga/mac/x64/jre/hotspot/normal/eclipse?project=jdk',
    filename: 'jre-macos-x64.tar.gz',
  },
  'macos-arm64': {
    platform: 'macos-arm64',
    url: 'https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jre/hotspot/normal/eclipse?project=jdk',
    filename: 'jre-macos-arm64.tar.gz',
  },
  'win-x64': {
    platform: 'win-x64',
    url: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk',
    filename: 'jre-win-x64.zip',
  },
  'linux-x64': {
    platform: 'linux-x64',
    url: 'https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jre/hotspot/normal/eclipse?project=jdk',
    filename: 'jre-linux-x64.tar.gz',
  },
};

// Solo descargar para la plataforma actual
const currentPlatform = getBuildPlatform();
const JRE_DOWNLOADS = [ALL_JRE_DOWNLOADS[currentPlatform]];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    console.log(`Downloading: ${url}`);
    console.log(`To: ${dest}`);

    const request = protocol.get(url, (response) => {
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

function extractArchive(archivePath, platform, destDir) {
  console.log(`Extracting ${archivePath}...`);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    if (archivePath.endsWith('.tar.gz')) {
      // Extract tar.gz
      execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });

      // Find the extracted directory (usually has version number)
      const extractedDirs = fs.readdirSync(destDir).filter((f) => {
        const fullPath = path.join(destDir, f);
        return fs.statSync(fullPath).isDirectory();
      });

      if (extractedDirs.length > 0) {
        const extractedDir = path.join(destDir, extractedDirs[0]);

        // For macOS, the JRE is nested inside Contents/Home/
        let sourceDir = extractedDir;
        if (platform.startsWith('macos')) {
          const contentsHome = path.join(extractedDir, 'Contents', 'Home');
          if (fs.existsSync(contentsHome)) {
            sourceDir = contentsHome;
            console.log('Detected macOS JRE structure (Contents/Home), extracting from nested directory...');
          }
        }

        const files = fs.readdirSync(sourceDir);

        // Move contents up to destDir
        files.forEach((file) => {
          const oldPath = path.join(sourceDir, file);
          const newPath = path.join(destDir, file);
          if (fs.existsSync(newPath)) {
            execSync(`rm -rf "${newPath}"`);
          }
          fs.renameSync(oldPath, newPath);
        });

        // Remove the extracted directory and all its parents
        execSync(`rm -rf "${extractedDir}"`);
      }
    } else if (archivePath.endsWith('.zip')) {
      // Extract zip (Windows)
      execSync(`unzip -q "${archivePath}" -d "${destDir}"`, { stdio: 'inherit' });

      // Find the extracted directory
      const extractedDirs = fs.readdirSync(destDir).filter((f) => {
        const fullPath = path.join(destDir, f);
        return fs.statSync(fullPath).isDirectory();
      });

      if (extractedDirs.length > 0) {
        const extractedDir = path.join(destDir, extractedDirs[0]);
        const files = fs.readdirSync(extractedDir);

        // Move contents up one level
        files.forEach((file) => {
          const oldPath = path.join(extractedDir, file);
          const newPath = path.join(destDir, file);
          if (fs.existsSync(newPath)) {
            execSync(`rm -rf "${newPath}"`);
          }
          fs.renameSync(oldPath, newPath);
        });

        // Remove empty directory
        fs.rmdirSync(extractedDir);
      }
    }

    console.log(`Extracted to: ${destDir}\n`);
  } catch (error) {
    console.error(`Error extracting archive: ${error.message}`);
    throw error;
  }
}

async function downloadAndExtractJRE(platform, url, filename) {
  const platformDir = path.join(RESOURCES_DIR, platform);
  const downloadPath = path.join(RESOURCES_DIR, filename);

  // Check if already downloaded
  if (fs.existsSync(platformDir) && fs.readdirSync(platformDir).length > 0) {
    console.log(`✓ JRE for ${platform} already exists, skipping download\n`);
    return;
  }

  console.log(`\n=== Downloading JRE for ${platform} ===`);

  try {
    // Create directories
    if (!fs.existsSync(RESOURCES_DIR)) {
      fs.mkdirSync(RESOURCES_DIR, { recursive: true });
    }

    // Download
    await downloadFile(url, downloadPath);

    // Extract
    extractArchive(downloadPath, platform, platformDir);

    // Verify java exists
    const javaExecutable = platform.startsWith('win') ? 'java.exe' : 'java';
    const javaPath = path.join(platformDir, 'bin', javaExecutable);

    if (fs.existsSync(javaPath)) {
      console.log(`✓ Successfully installed JRE for ${platform}`);
      // Make executable on Unix systems
      if (!platform.startsWith('win')) {
        execSync(`chmod +x "${javaPath}"`);
      }
    } else {
      throw new Error(`Java executable not found at ${javaPath}`);
    }

    // Clean up archive
    fs.unlinkSync(downloadPath);
  } catch (error) {
    console.error(`✗ Failed to download JRE for ${platform}: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('===========================================');
  console.log(`  Downloading JRE 21 for ${currentPlatform}`);
  console.log('===========================================\n');

  for (const jre of JRE_DOWNLOADS) {
    try {
      await downloadAndExtractJRE(jre.platform, jre.url, jre.filename);
    } catch (error) {
      console.error(`Failed to download JRE for ${jre.platform}:`, error);
      process.exit(1);
    }
  }

  console.log('\n===========================================');
  console.log(`  ✓ JRE download for ${currentPlatform} complete!`);
  console.log('===========================================');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
