import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

import { DOWNLOAD } from '../utils/constants.js';

export function downloadFile(url, destination, redirectCount = 0) {
  const MAX_REDIRECTS = DOWNLOAD.MAX_REDIRECTS;
  return new Promise((resolve, reject) => {
    const destinationFileStream = fs.createWriteStream(destination);
    const protocol = url.startsWith('https') ? https : http;

    console.log(`Downloading: ${url}`);
    console.log(`To: ${destination}`);

    const downloadRequest = protocol.get(url, (downloadResponse) => {
      if (downloadResponse.statusCode === 301 || downloadResponse.statusCode === 302 ||
          downloadResponse.statusCode === 307 || downloadResponse.statusCode === 308) {
        const redirectUrl = downloadResponse.headers.location;
        destinationFileStream.close();
        fs.unlinkSync(destination);
        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error(`Too many redirects (max ${MAX_REDIRECTS})`));
          return;
        }
        console.log(`Following redirect (${downloadResponse.statusCode}) to: ${redirectUrl}`);
        downloadFile(redirectUrl, destination, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (downloadResponse.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${downloadResponse.statusCode}`));
        return;
      }

      const totalSize = parseInt(downloadResponse.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;

      downloadResponse.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
          lastPercent = percent;
        }
      });

      downloadResponse.pipe(destinationFileStream);

      destinationFileStream.on('finish', () => {
        destinationFileStream.close();
        console.log('Download complete!\n');
        resolve();
      });
    });

    downloadRequest.on('error', (requestError) => {
      fs.unlink(destination, () => {});
      reject(requestError);
    });

    destinationFileStream.on('error', (fileStreamError) => {
      fs.unlink(destination, () => {});
      reject(fileStreamError);
    });
  });
}

export function findSingleExtractedDirectory(destinationDirectory) {
  const extractedDirectories = fs.readdirSync(destinationDirectory).filter((entryName) => {
    const fullPath = path.join(destinationDirectory, entryName);
    return fs.statSync(fullPath).isDirectory();
  });

  if (extractedDirectories.length === 0) {
    return null;
  }

  return path.join(destinationDirectory, extractedDirectories[0]);
}

export function moveChildrenUp(sourceDirectory, destinationDirectory) {
  const childEntryNames = fs.readdirSync(sourceDirectory);

  childEntryNames.forEach((entryName) => {
    const oldPath = path.join(sourceDirectory, entryName);
    const newPath = path.join(destinationDirectory, entryName);
    if (fs.existsSync(newPath)) {
      fs.rmSync(newPath, { recursive: true, force: true });
    }
    fs.renameSync(oldPath, newPath);
  });
}

export function flattenSingleNestedDirectory(destinationDirectory) {
  const extractedDirectory = findSingleExtractedDirectory(destinationDirectory);

  if (!extractedDirectory) {
    return;
  }

  moveChildrenUp(extractedDirectory, destinationDirectory);
  fs.rmSync(extractedDirectory, { recursive: true, force: true });
}
