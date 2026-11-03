export function printHtmlDocument({ htmlContent, title = "Document" }) {
  const printDocumentBlob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const printDocumentUrl = URL.createObjectURL(printDocumentBlob);
  const printWindow = window.open(printDocumentUrl, "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(printDocumentUrl);
    throw new Error("Print window was blocked");
  }

  printWindow.addEventListener("load", () => {
    printWindow.document.title = title;
    printWindow.focus();
    printWindow.print();
    URL.revokeObjectURL(printDocumentUrl);
  }, { once: true });
}
