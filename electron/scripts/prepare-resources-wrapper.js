import { execSync } from 'child_process';
import path from 'path';

const scriptDirectory = import.meta.dirname;

const isWindows = process.platform === 'win32';
const scriptName = isWindows ? 'prepare-resources.bat' : 'prepare-resources.sh';
const scriptPath = path.join(scriptDirectory, scriptName);

console.log(`Running ${scriptName} for platform: ${process.platform}`);

try {
  if (isWindows) {
    execSync(`"${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(scriptDirectory, '..'),
    });
  } else {
    execSync(`bash "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(scriptDirectory, '..'),
    });
  }

  console.log('\nResource preparation completed successfully!');
  process.exit(0);
} catch (preparationError) {
  console.error('\nResource preparation failed:', preparationError.message);
  process.exit(1);
}
