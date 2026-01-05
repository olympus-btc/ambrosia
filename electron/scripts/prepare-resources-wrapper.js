const { execSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;

// Determine which script to run based on platform
const isWindows = process.platform === 'win32';
const scriptName = isWindows ? 'prepare-resources.bat' : 'prepare-resources.sh';
const scriptPath = path.join(scriptDir, scriptName);

console.log(`Running ${scriptName} for platform: ${process.platform}`);

try {
  if (isWindows) {
    // On Windows, run the .bat file
    execSync(`"${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(scriptDir, '..'),
    });
  } else {
    // On Unix systems, run the .sh file with bash
    execSync(`bash "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(scriptDir, '..'),
    });
  }

  console.log('\nResource preparation completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\nResource preparation failed:', error.message);
  process.exit(1);
}
