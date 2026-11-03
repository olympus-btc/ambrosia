export function downloadBlob(blob, filename) {
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  try {
    downloadLink.click();
  } finally {
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
  }
}
