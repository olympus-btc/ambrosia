import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

const ELECTRON_DIRECTORY = path.join(import.meta.dirname, '..');

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
      const entryPath = path.join(ELECTRON_DIRECTORY, target.entry);
      const outfilePath = path.join(ELECTRON_DIRECTORY, target.outfile);

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
  } catch (bundlingError) {
    console.error('\n✗ Preload bundling failed:', bundlingError.message);
    process.exit(1);
  }
}

main();
