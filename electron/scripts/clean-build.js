import fs from 'fs';
import path from 'path';

const ELECTRON_DIRECTORY = path.join(import.meta.dirname, '..');
const RESOURCES_DIRECTORY = path.join(ELECTRON_DIRECTORY, 'resources');
const DIST_DIRECTORY = path.join(ELECTRON_DIRECTORY, 'dist');

console.log('===========================================');
console.log('  Cleaning Build Directories');
console.log('===========================================\n');

if (fs.existsSync(RESOURCES_DIRECTORY)) {
  console.log('Removing resources directory...');
  fs.rmSync(RESOURCES_DIRECTORY, { recursive: true, force: true });
  console.log('✓ Resources directory removed\n');
} else {
  console.log('✓ Resources directory does not exist (skipping)\n');
}

if (fs.existsSync(DIST_DIRECTORY)) {
  console.log('Removing dist directory...');
  fs.rmSync(DIST_DIRECTORY, { recursive: true, force: true });
  console.log('✓ Dist directory removed\n');
} else {
  console.log('✓ Dist directory does not exist (skipping)\n');
}

console.log('===========================================');
console.log('  ✓ Cleanup complete!');
console.log('===========================================\n');
