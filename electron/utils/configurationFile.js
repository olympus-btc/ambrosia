import fs from 'fs';

export function readConfigurationFile(configurationFilePath) {
  if (!fs.existsSync(configurationFilePath)) {
    return {};
  }

  const configurationFileContent = fs.readFileSync(configurationFilePath, 'utf-8');
  const configurationEntries = {};

  configurationFileContent.split('\n').forEach((configurationLine) => {
    const trimmedConfigurationLine = configurationLine.trim();
    if (trimmedConfigurationLine && !trimmedConfigurationLine.startsWith('#')) {
      const [configurationKey, ...configurationValueParts] = trimmedConfigurationLine.split('=');
      if (configurationKey && configurationValueParts.length > 0) {
        configurationEntries[configurationKey.trim()] = configurationValueParts.join('=').trim();
      }
    }
  });

  return configurationEntries;
}
