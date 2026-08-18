const fs = require('fs');
const path = require('path');

const esbuild = require('esbuild');

const ELECTRON_DIR = path.join(__dirname, '..');

const PRELOAD_TARGETS = [
  { entry: 'preload.entry.js', outfile: 'preload.js' },
  { entry: 'splash-preload.entry.js', outfile: 'splash-preload.js' },
];

function main() {
  console.log('===========================================');
  console.log('  Bundling Preload Scripts');
  console.log('===========================================\n');

  try {
    for (const target of PRELOAD_TARGETS) {
      const entryPath = path.join(ELECTRON_DIR, target.entry);
      const outfilePath = path.join(ELECTRON_DIR, target.outfile);

      console.log(`Bundling ${target.entry} -> ${target.outfile}...`);

      esbuild.buildSync({
        entryPoints: [entryPath],
        outfile: outfilePath,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        external: ['electron'],
      });

      if (!fs.existsSync(outfilePath)) {
        throw new Error(`Bundle not found after build: ${outfilePath}`);
      }

      const sizeInKB = (fs.statSync(outfilePath).size / 1024).toFixed(1);
      console.log(`✓ ${target.outfile} (${sizeInKB} KB)\n`);
    }

    console.log('===========================================');
    console.log('  ✓ Preload bundling complete!');
    console.log('===========================================');
  } catch (error) {
    console.error('\n✗ Preload bundling failed:', error.message);
    process.exit(1);
  }
}

main();
