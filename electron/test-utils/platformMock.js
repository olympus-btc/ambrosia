const originalPlatform = process.platform;
const originalArch = process.arch;

function setPlatformAndArch(platform, arch) {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  Object.defineProperty(process, 'arch', { value: arch, configurable: true });
}

function restorePlatformAndArch() {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
}

module.exports = { setPlatformAndArch, restorePlatformAndArch };
