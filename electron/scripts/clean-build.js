const fs = require('fs');
const path = require('path');

const ELECTRON_DIR = path.join(__dirname, '..');
const RESOURCES_DIR = path.join(ELECTRON_DIR, 'resources');
const DIST_DIR = path.join(ELECTRON_DIR, 'dist');

console.log('===========================================');
console.log('  Cleaning Build Directories');
console.log('===========================================\n');

// Clean resources directory
if (fs.existsSync(RESOURCES_DIR)) {
  console.log('Removing resources directory...');
  fs.rmSync(RESOURCES_DIR, { recursive: true, force: true });
  console.log('✓ Resources directory removed\n');
} else {
  console.log('✓ Resources directory does not exist (skipping)\n');
}

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  console.log('Removing dist directory...');
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  console.log('✓ Dist directory removed\n');
} else {
  console.log('✓ Dist directory does not exist (skipping)\n');
}

console.log('===========================================');
console.log('  ✓ Cleanup complete!');
console.log('===========================================\n');
