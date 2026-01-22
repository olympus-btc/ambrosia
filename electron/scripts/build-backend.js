const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', 'server');
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'backend');

function main() {
  console.log('===========================================');
  console.log('  Building Backend JAR');
  console.log('===========================================\n');

  try {
    // Create resources directory
    if (!fs.existsSync(RESOURCES_DIR)) {
      fs.mkdirSync(RESOURCES_DIR, { recursive: true });
      console.log(`✓ Created directory: ${RESOURCES_DIR}\n`);
    }

    // Build JAR with Gradle
    console.log('Building JAR with Gradle...');
    console.log(`Working directory: ${SERVER_DIR}\n`);

    // Use appropriate Gradle wrapper for platform
    let gradleCommand;
    if (process.platform === 'win32') {
      // On Windows, use .\ prefix to execute batch file from current directory
      gradleCommand = '.\\gradlew.bat clean jar';
    } else {
      gradleCommand = './gradlew clean jar';
    }
    console.log(`Running: ${gradleCommand}\n`);

    execSync(gradleCommand, {
      cwd: SERVER_DIR,
      stdio: 'inherit',
      shell: true,
    });

    console.log('\n✓ JAR build complete\n');

    // Find the JAR file dynamically
    const libsDir = path.join(SERVER_DIR, 'app', 'build', 'libs');
    const jarFiles = fs.readdirSync(libsDir).filter((file) => file.startsWith('ambrosia-') && file.endsWith('.jar'));

    if (jarFiles.length === 0) {
      throw new Error(`No JAR file found in: ${libsDir}`);
    }

    if (jarFiles.length > 1) {
      console.log(`⚠ Multiple JAR files found, using the first one: ${jarFiles[0]}`);
    }

    const jarSourcePath = path.join(libsDir, jarFiles[0]);

    if (!fs.existsSync(jarSourcePath)) {
      throw new Error(`JAR not found at: ${jarSourcePath}`);
    }

    console.log(`Found JAR: ${jarSourcePath}`);

    // Get JAR size
    const stats = fs.statSync(jarSourcePath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`JAR size: ${sizeInMB} MB\n`);

    // Copy JAR to resources
    const jarDestPath = path.join(RESOURCES_DIR, 'ambrosia.jar');
    console.log(`Copying to: ${jarDestPath}`);

    fs.copyFileSync(jarSourcePath, jarDestPath);

    console.log('✓ JAR copied successfully\n');

    // Verify copy
    if (fs.existsSync(jarDestPath)) {
      const destStats = fs.statSync(jarDestPath);
      const destSizeInMB = (destStats.size / 1024 / 1024).toFixed(2);
      console.log(`✓ Verified: ${jarDestPath} (${destSizeInMB} MB)`);
    } else {
      throw new Error('Failed to verify JAR copy');
    }

    console.log('\n===========================================');
    console.log('  ✓ Backend build complete!');
    console.log('===========================================');
  } catch (error) {
    console.error('\n✗ Backend build failed:', error.message);
    process.exit(1);
  }
}

main();
