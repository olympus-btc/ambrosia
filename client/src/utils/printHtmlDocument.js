export function printHtmlDocument({ htmlContent, title = "Document" }) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Print window was blocked");
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.document.title = title;
  printWindow.focus();
  printWindow.print();
}
