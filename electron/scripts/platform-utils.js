function getBuildPlatform() {
  // Allow overriding platform via TARGET_PLATFORM env var for cross-platform builds
  // Example: TARGET_PLATFORM=win-x64 npm run dist:win
  if (process.env.TARGET_PLATFORM) {
    const validPlatforms = ['macos-arm64', 'macos-x64', 'win-x64', 'win-arm64', 'linux-x64'];
    if (!validPlatforms.includes(process.env.TARGET_PLATFORM)) {
      throw new Error(`Invalid TARGET_PLATFORM: ${process.env.TARGET_PLATFORM}. Must be one of: ${validPlatforms.join(', ')}`);
    }
    console.log(`[platform-utils] Using TARGET_PLATFORM: ${process.env.TARGET_PLATFORM}`);
    return process.env.TARGET_PLATFORM;
  }

  // Auto-detect platform if TARGET_PLATFORM not set
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'macos-arm64' : 'macos-x64';
  } else if (platform === 'win32') {
    return arch === 'arm64' ? 'win-arm64' : 'win-x64';
  } else if (platform === 'linux') {
    return 'linux-x64';
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

module.exports = {
  getBuildPlatform,
};
