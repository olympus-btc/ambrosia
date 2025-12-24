const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', 'server');
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'backend');
const JAR_NAME = 'ambrosia-0.3.0-alpha.jar';

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

    execSync('./gradlew clean jar', {
      cwd: SERVER_DIR,
      stdio: 'inherit',
    });

    console.log('\n✓ JAR build complete\n');

    // Find the JAR file
    const jarSourcePath = path.join(SERVER_DIR, 'app', 'build', 'libs', JAR_NAME);

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
