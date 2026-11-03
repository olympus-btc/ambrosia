import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLIENT_DIRECTORY = path.join(import.meta.dirname, '..', '..', 'client');
const RESOURCES_DIRECTORY = path.join(import.meta.dirname, '..', 'resources', 'client');

function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function getDirectorySize(directoryPath) {
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

  if (fs.existsSync(directoryPath)) {
    calculateSize(directoryPath);
  }

  return totalSize;
}

function main() {
  console.log('===========================================');
  console.log('  Building Next.js Client');
  console.log('===========================================\n');

  try {
    console.log('Building Next.js with production optimizations...');
    console.log(`Working directory: ${CLIENT_DIRECTORY}\n`);

    execSync('npm run build:electron', {
      cwd: CLIENT_DIRECTORY,
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON: 'true',
      },
    });

    console.log('\n✓ Next.js build complete\n');

    const standalonePath = path.join(CLIENT_DIRECTORY, '.next', 'standalone');
    if (!fs.existsSync(standalonePath)) {
      throw new Error(`Standalone build not found at: ${standalonePath}`);
    }

    console.log(`Found standalone build: ${standalonePath}\n`);

    if (fs.existsSync(RESOURCES_DIRECTORY)) {
      console.log('Removing old client resources...');
      fs.rmSync(RESOURCES_DIRECTORY, { recursive: true, force: true });
    }

    fs.mkdirSync(RESOURCES_DIRECTORY, { recursive: true });
    console.log(`✓ Created directory: ${RESOURCES_DIRECTORY}\n`);

    // Next.js 16 nests standalone output inside a subdirectory named after the project
    // (.next/standalone/client/server.js instead of .next/standalone/server.js)
    console.log('Copying standalone build...');
    let standaloneRoot = standalonePath;
    if (!fs.existsSync(path.join(standaloneRoot, 'server.js'))) {
      const entries = fs.readdirSync(standaloneRoot, { withFileTypes: true });
      const nested = entries.find(
        (entry) => entry.isDirectory() && fs.existsSync(path.join(standaloneRoot, entry.name, 'server.js')),
      );
      if (nested) {
        standaloneRoot = path.join(standaloneRoot, nested.name);
        console.log(`Detected nested standalone structure, using: ${standaloneRoot}\n`);
      } else {
        throw new Error(`server.js not found inside standalone build at: ${standaloneRoot}`);
      }
    }
    copyDirectory(standaloneRoot, RESOURCES_DIRECTORY);
    console.log('✓ Copied standalone build to root\n');

    console.log('Copying static files...');
    const staticPath = path.join(CLIENT_DIRECTORY, '.next', 'static');
    if (fs.existsSync(staticPath)) {
      copyDirectory(staticPath, path.join(RESOURCES_DIRECTORY, '.next', 'static'));
      console.log('✓ Copied .next/static\n');
    }

    console.log('Copying public directory...');
    const publicPath = path.join(CLIENT_DIRECTORY, 'public');
    if (fs.existsSync(publicPath)) {
      copyDirectory(publicPath, path.join(RESOURCES_DIRECTORY, 'public'));
      console.log('✓ Copied public\n');
    }

    console.log('Copying configuration files...');
    const configFilenames = [
      'package.json',
      'next.config.mjs',
    ];

    for (const configFilename of configFilenames) {
      const sourcePath = path.join(CLIENT_DIRECTORY, configFilename);
      const destinationPath = path.join(RESOURCES_DIRECTORY, configFilename);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destinationPath);
        console.log(`✓ Copied ${configFilename}`);
      }
    }

    console.log('');

    const totalSize = getDirectorySize(RESOURCES_DIRECTORY);
    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log(`\n✓ Client resources total size: ${sizeInMB} MB`);

    console.log('\n===========================================');
    console.log('  ✓ Client build complete!');
    console.log('===========================================');
  } catch (clientBuildError) {
    console.error('\n✗ Client build failed:', clientBuildError.message);
    process.exit(1);
  }
}

main();
