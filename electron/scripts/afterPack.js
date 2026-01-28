const { execSync } = require('child_process');
const path = require('path');

/**
 * afterPack hook for electron-builder
 * Re-signs the macOS app bundle with ad-hoc signature to fix ARM64 signing issues
 *
 * electron-builder's automatic signing doesn't properly sign ARM64 builds,
 * resulting in 'is damaged and can't be opened' errors when downloaded from internet.
 * This script manually re-signs with --deep --force to ensure all binaries are signed.
 */
async function afterPack(context) {
  // Only run for macOS builds
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  const entitlementsPath = path.join(
    context.packager.projectDir,
    'build',
    'entitlements.mac.plist',
  );

  console.log(`\n🔐 Re-signing macOS app bundle: ${appPath}`);

  try {
    // Fix permissions on JRE files (classes.jsa and others may be read-only)
    const resourcesPath = path.join(appPath, 'Contents', 'Resources');
    console.log(`   Fixing file permissions...`);
    execSync(`chmod -R u+w '${resourcesPath}'`, { stdio: 'inherit' });

    // Re-sign the entire app bundle with ad-hoc signature
    const signCommand = `codesign --force --deep --sign - --entitlements '${entitlementsPath}' '${appPath}'`;

    console.log(`   Running: codesign --force --deep --sign - ...`);
    execSync(signCommand, { stdio: 'inherit' });

    // Verify the signature
    console.log(`   Verifying signature...`);
    execSync(`codesign --verify --deep --strict '${appPath}'`, { stdio: 'inherit' });

    console.log(`✅ App bundle re-signed successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to re-sign app bundle: ${error.message}`);
    throw error;
  }
}

module.exports = afterPack;
