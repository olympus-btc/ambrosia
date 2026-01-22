const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.join(__dirname, '..', '..', 'client');
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'client');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        calculateSize(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      }
    }
  }

  if (fs.existsSync(dirPath)) {
    calculateSize(dirPath);
  }

  return totalSize;
}

function main() {
  console.log('===========================================');
  console.log('  Building Next.js Client');
  console.log('===========================================\n');

  try {
    // Build Next.js with electron flag
    console.log('Building Next.js with production optimizations...');
    console.log(`Working directory: ${CLIENT_DIR}\n`);

    execSync('npm run build:electron', {
      cwd: CLIENT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON: 'true',
      },
    });

    console.log('\n✓ Next.js build complete\n');

    // Verify .next/standalone exists
    const standalonePath = path.join(CLIENT_DIR, '.next', 'standalone');
    if (!fs.existsSync(standalonePath)) {
      throw new Error(`Standalone build not found at: ${standalonePath}`);
    }

    console.log(`Found standalone build: ${standalonePath}\n`);

    // Create resources directory
    if (fs.existsSync(RESOURCES_DIR)) {
      console.log('Removing old client resources...');
      fs.rmSync(RESOURCES_DIR, { recursive: true, force: true });
    }

    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
    console.log(`✓ Created directory: ${RESOURCES_DIR}\n`);

    // Copy standalone build
    console.log('Copying standalone build...');
    copyDirectory(standalonePath, RESOURCES_DIR);
    console.log('✓ Copied standalone build to root\n');

    // Copy static files into standalone/.next/static
    console.log('Copying static files...');
    const staticPath = path.join(CLIENT_DIR, '.next', 'static');
    if (fs.existsSync(staticPath)) {
      copyDirectory(staticPath, path.join(RESOURCES_DIR, '.next', 'static'));
      console.log('✓ Copied .next/static\n');
    }

    // Copy public directory into standalone/public
    console.log('Copying public directory...');
    const publicPath = path.join(CLIENT_DIR, 'public');
    if (fs.existsSync(publicPath)) {
      copyDirectory(publicPath, path.join(RESOURCES_DIR, 'public'));
      console.log('✓ Copied public\n');
    }

    // Copy necessary config files
    console.log('Copying configuration files...');
    const configFiles = [
      'package.json',
      'next.config.mjs',
    ];

    for (const file of configFiles) {
      const srcPath = path.join(CLIENT_DIR, file);
      const destPath = path.join(RESOURCES_DIR, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ Copied ${file}`);
      }
    }

    console.log('');

    // Calculate size
    const totalSize = getDirectorySize(RESOURCES_DIR);
    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log(`\n✓ Client resources total size: ${sizeInMB} MB`);

    console.log('\n===========================================');
    console.log('  ✓ Client build complete!');
    console.log('===========================================');
  } catch (error) {
    console.error('\n✗ Client build failed:', error.message);
    process.exit(1);
  }
}

main();
