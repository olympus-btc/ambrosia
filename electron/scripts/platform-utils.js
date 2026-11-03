export function getBuildPlatform() {
  if (process.env.TARGET_PLATFORM) {
    const validPlatforms = ['macos-arm64', 'macos-x64', 'win-x64', 'win-arm64', 'linux-x64', 'linux-arm64'];
    if (!validPlatforms.includes(process.env.TARGET_PLATFORM)) {
      throw new Error(`Invalid TARGET_PLATFORM: ${process.env.TARGET_PLATFORM}. Must be one of: ${validPlatforms.join(', ')}`);
    }
    console.log(`[platform-utils] Using TARGET_PLATFORM: ${process.env.TARGET_PLATFORM}`);
    return process.env.TARGET_PLATFORM;
  }

  const platform = process.platform;
  const architecture = process.arch;

  if (platform === 'darwin') {
    return architecture === 'arm64' ? 'macos-arm64' : 'macos-x64';
  } else if (platform === 'win32') {
    return architecture === 'arm64' ? 'win-arm64' : 'win-x64';
  } else if (platform === 'linux') {
    return architecture === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }

  throw new Error(`Unsupported platform: ${platform}-${architecture}`);
}
