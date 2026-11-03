import { printHtmlDocument } from "../printHtmlDocument";

describe("printHtmlDocument", () => {
  let originalWindowOpen;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    originalWindowOpen = window.open;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:invoice-document");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("opens the html document blob and prints after it loads", () => {
    let loadHandler;
    const printWindow = {
      document: {
        title: "",
      },
      focus: jest.fn(),
      print: jest.fn(),
      addEventListener: jest.fn((eventName, handler) => {
        if (eventName === "load") loadHandler = handler;
      }),
    };
    window.open = jest.fn(() => printWindow);

    printHtmlDocument({
      htmlContent: "<html><body>Invoice</body></html>",
      title: "Invoice 2026-0001",
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(window.open).toHaveBeenCalledWith("blob:invoice-document", "_blank");
    expect(printWindow.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });

    loadHandler();

    expect(printWindow.document.title).toBe("Invoice 2026-0001");
    expect(printWindow.focus).toHaveBeenCalledTimes(1);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:invoice-document");
  });

  it("throws when the print window is blocked", () => {
    window.open = jest.fn(() => null);

    expect(() => {
      printHtmlDocument({
        htmlContent: "<html><body>Invoice</body></html>",
      });
    }).toThrow("Print window was blocked");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:invoice-document");
  });
});
