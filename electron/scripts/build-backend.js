import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SERVER_DIRECTORY = path.join(import.meta.dirname, '..', '..', 'server');
const RESOURCES_DIRECTORY = path.join(import.meta.dirname, '..', 'resources', 'backend');

function main() {
  console.log('===========================================');
  console.log('  Building Backend JAR');
  console.log('===========================================\n');

  try {
    if (!fs.existsSync(RESOURCES_DIRECTORY)) {
      fs.mkdirSync(RESOURCES_DIRECTORY, { recursive: true });
      console.log(`✓ Created directory: ${RESOURCES_DIRECTORY}\n`);
    }

    console.log('Building JAR with Gradle...');
    console.log(`Working directory: ${SERVER_DIRECTORY}\n`);

    let gradleCommand;
    if (process.platform === 'win32') {
      gradleCommand = '.\\gradlew.bat clean jar';
    } else {
      gradleCommand = './gradlew clean jar';
    }
    console.log(`Running: ${gradleCommand}\n`);

    execSync(gradleCommand, {
      cwd: SERVER_DIRECTORY,
      stdio: 'inherit',
      shell: true,
    });

    console.log('\n✓ JAR build complete\n');

    const libsDirectory = path.join(SERVER_DIRECTORY, 'app', 'build', 'libs');
    const jarFilenames = fs.readdirSync(libsDirectory).filter((jarFilename) => jarFilename.startsWith('ambrosia-') && jarFilename.endsWith('.jar'));

    if (jarFilenames.length === 0) {
      throw new Error(`No JAR file found in: ${libsDirectory}`);
    }

    if (jarFilenames.length > 1) {
      console.log(`⚠ Multiple JAR files found, using the first one: ${jarFilenames[0]}`);
    }

    const jarSourcePath = path.join(libsDirectory, jarFilenames[0]);

    if (!fs.existsSync(jarSourcePath)) {
      throw new Error(`JAR not found at: ${jarSourcePath}`);
    }

    console.log(`Found JAR: ${jarSourcePath}`);

    const jarSourceStats = fs.statSync(jarSourcePath);
    const jarSourceSizeInMB = (jarSourceStats.size / 1024 / 1024).toFixed(2);
    console.log(`JAR size: ${jarSourceSizeInMB} MB\n`);

    const jarDestinationPath = path.join(RESOURCES_DIRECTORY, 'ambrosia.jar');
    console.log(`Copying to: ${jarDestinationPath}`);

    fs.copyFileSync(jarSourcePath, jarDestinationPath);

    console.log('✓ JAR copied successfully\n');

    if (fs.existsSync(jarDestinationPath)) {
      const jarDestinationStats = fs.statSync(jarDestinationPath);
      const jarDestinationSizeInMB = (jarDestinationStats.size / 1024 / 1024).toFixed(2);
      console.log(`✓ Verified: ${jarDestinationPath} (${jarDestinationSizeInMB} MB)`);
    } else {
      throw new Error('Failed to verify JAR copy');
    }

    console.log('\n===========================================');
    console.log('  ✓ Backend build complete!');
    console.log('===========================================');
  } catch (backendBuildError) {
    console.error('\n✗ Backend build failed:', backendBuildError.message);
    process.exit(1);
  }
}

main();
