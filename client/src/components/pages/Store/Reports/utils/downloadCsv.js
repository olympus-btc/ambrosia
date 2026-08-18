export function downloadCsv(csvContent, filename) {
  const csvDownloadUrl = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
  const downloadLink = document.createElement("a");
  downloadLink.href = csvDownloadUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  try {
    downloadLink.click();
  } finally {
    downloadLink.remove();
    URL.revokeObjectURL(csvDownloadUrl);
  }
}
