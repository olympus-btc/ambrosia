import os from 'os';
import path from 'path';

export function getDataDirectory() {
  return path.join(os.homedir(), '.Ambrosia-POS');
}

export function getPhoenixDataDirectory() {
  return path.join(os.homedir(), '.phoenix');
}

export function getLogsDirectory() {
  return path.join(getDataDirectory(), 'logs');
}

export function getElectronLogsDirectory() {
  return path.join(getLogsDirectory(), 'electron');
}
