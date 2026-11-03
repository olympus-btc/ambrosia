import { execFileSync } from 'child_process';
import path from 'path';

function getCodeSignIdentity() {
  return process.env.MACOS_CODE_SIGN_IDENTITY || process.env.CSC_NAME || '-';
}

function getCodeSignLabel(codeSignIdentity) {
  return codeSignIdentity === '-' ? 'ad-hoc' : codeSignIdentity;
}

function runCommand(command, commandArguments) {
  execFileSync(command, commandArguments, { stdio: 'inherit' });
}

async function afterPack(context) {
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
    const resourcesPath = path.join(appPath, 'Contents', 'Resources');
    console.log(`   Fixing file permissions...`);
    runCommand('chmod', ['-R', 'u+w', resourcesPath]);

    const codeSignIdentity = getCodeSignIdentity();
    const codeSignLabel = getCodeSignLabel(codeSignIdentity);

    console.log(`   Running: codesign --force --deep --sign ${codeSignLabel} ...`);
    runCommand('codesign', [
      '--force',
      '--deep',
      '--sign',
      codeSignIdentity,
      '--entitlements',
      entitlementsPath,
      appPath,
    ]);

    console.log(`   Verifying signature...`);
    runCommand('codesign', ['--verify', '--deep', '--strict', appPath]);

    console.log(`✅ App bundle re-signed successfully\n`);
  } catch (codeSignError) {
    console.error(`❌ Failed to re-sign app bundle: ${codeSignError.message}`);
    throw codeSignError;
  }
}

export default afterPack;
