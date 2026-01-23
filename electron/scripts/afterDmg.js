const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * afterAllArtifactBuild hook for electron-builder
 *
 * electron-builder on ARM64 macOS uses APFS which doesn't support
 * custom backgrounds. This script replaces the APFS DMG with a custom
 * HFS+ DMG using appdmg for full visual customization.
 */
async function afterAllArtifactBuild(buildResult) {
  const platform = buildResult.platformToTargets.keys().next().value;

  // Only process macOS builds
  if (!platform || platform.name !== 'mac') {
    return buildResult.artifactPaths;
  }

  const projectDir = path.resolve(__dirname, '..');
  const backgroundPath = path.join(projectDir, 'build', 'background.png');

  // Find the DMG in artifacts
  const dmgIndex = buildResult.artifactPaths.findIndex((p) => p.endsWith('.dmg'));
  if (dmgIndex === -1) {
    console.log('   No DMG found in artifacts, skipping custom DMG creation');
    return buildResult.artifactPaths;
  }

  const originalDmg = buildResult.artifactPaths[dmgIndex];

  // Find the .app bundle
  const outDir = path.join(projectDir, 'dist');
  const macDirs = fs.readdirSync(outDir).filter((d) => d.startsWith('mac'));
  let appPath = null;

  for (const macDir of macDirs) {
    const dirPath = path.join(outDir, macDir);
    const apps = fs.readdirSync(dirPath).filter((f) => f.endsWith('.app'));
    if (apps.length > 0) {
      appPath = path.join(dirPath, apps[0]);
      break;
    }
  }

  if (!appPath) {
    console.log('   ⚠️  Could not find .app bundle, keeping original DMG');
    return buildResult.artifactPaths;
  }

  if (!fs.existsSync(backgroundPath)) {
    console.log('   ⚠️  No background image found at build/background.png, keeping original DMG');
    return buildResult.artifactPaths;
  }

  console.log('   Replacing APFS DMG with custom HFS+ DMG...');

  try {
    await createDmg(appPath, originalDmg, {
      volumeName: 'AmbrosiaPoS',
      backgroundPath,
      windowWidth: 660,
      windowHeight: 450,
      iconSize: 80,
      appIconX: 180,
      appIconY: 240,
      appLinkX: 480,
      appLinkY: 240,
    });
  } catch (error) {
    console.error(`   ❌ Custom DMG creation failed: ${error.message}`);
    console.log('   Keeping original DMG');
  }

  return buildResult.artifactPaths;
}

async function createDmg(appPath, outputPath, options = {}) {
  const appdmg = require('appdmg');

  const {
    volumeName = 'AmbrosiaPoS',
    backgroundPath = null,
    windowWidth = 660,
    windowHeight = 450,
    iconSize = 80,
    appIconX = 180,
    appIconY = 240,
    appLinkX = 480,
    appLinkY = 240,
  } = options;

  console.log(`\n📦 Creating custom DMG: ${path.basename(outputPath)}`);

  // Remove existing DMG and blockmap
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  const blockmapPath = `${outputPath}.blockmap`;
  if (fs.existsSync(blockmapPath)) fs.unlinkSync(blockmapPath);

  const dmgSpec = {
    title: volumeName,
    icon: path.join(__dirname, '..', 'build', 'icon.icns'),
    'icon-size': iconSize,
    window: {
      size: { width: windowWidth, height: windowHeight },
    },
    contents: [
      { x: appIconX, y: appIconY, type: 'file', path: appPath },
      { x: appLinkX, y: appLinkY, type: 'link', path: '/Applications' },
    ],
  };

  if (backgroundPath && fs.existsSync(backgroundPath)) {
    dmgSpec.background = backgroundPath;
  } else {
    console.log('   ⚠️  No background image found, creating without background');
  }

  // appdmg requires a file path for the spec
  const specPath = path.join(os.tmpdir(), `appdmg-spec-${Date.now()}.json`);
  fs.writeFileSync(specPath, JSON.stringify(dmgSpec, null, 2));

  return new Promise((resolve, reject) => {
    const dmg = appdmg({ source: specPath, target: outputPath });

    dmg.on('progress', (info) => {
      if (info.type === 'step-begin') {
        console.log(`   ${info.title}...`);
      }
    });

    dmg.on('finish', () => {
      if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
      console.log(`✅ DMG created: ${path.basename(outputPath)}\n`);
      resolve(outputPath);
    });

    dmg.on('error', (err) => {
      if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
      console.error(`❌ DMG creation failed: ${err.message}`);
      reject(err);
    });
  });
}

module.exports = afterAllArtifactBuild;
