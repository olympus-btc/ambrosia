import { addToast } from "@heroui/react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import jsQR from "jsqr";

import { PaymentForm } from "../PaymentForm";

jest.mock("jsqr", () => jest.fn());

jest.mock("lucide-react", () => ({
  Camera: () => <span data-testid="camera-icon" />,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ children, isDisabled, onPress, ...buttonProps }) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...buttonProps}>
      {children}
    </button>
  ),
  Input: ({ errorMessage, isDisabled, isInvalid, label, onChange, value }) => (
    <label>
      {label}
      <input aria-invalid={isInvalid} disabled={isDisabled} onChange={onChange} value={value} />
      {errorMessage ? <span>{errorMessage}</span> : null}
    </label>
  ),
  Spinner: () => <span data-testid="spinner" />,
}));

const originalFileReader = global.FileReader;
const originalImage = global.Image;
const originalMaxTouchPoints = navigator.maxTouchPoints;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

class MockFileReader {
  readAsDataURL() {
    this.onload?.({ target: { result: "data:image/png;base64,mock" } });
  }
}

class MockImage {
  constructor() {
    this.height = 100;
    this.width = 100;
  }

  set src(value) {
    this.imageSource = value;
    this.onload?.();
  }
}

function renderPaymentForm(props = {}) {
  const onInvoiceChange = jest.fn();
  const onSubmit = jest.fn();

  const renderResult = render(
    <PaymentForm
      invoiceValidationError=""
      isLoading={false}
      onInvoiceChange={onInvoiceChange}
      onSubmit={onSubmit}
      payInvoice=""
      {...props}
    />,
  );

  return {
    ...renderResult,
    onInvoiceChange,
    onSubmit,
  };
}

function scanQrFile(container) {
  const qrFileInput = container.querySelector('input[type="file"]');
  const qrFile = new File(["qr"], "invoice.png", { type: "image/png" });

  fireEvent.change(qrFileInput, { target: { files: [qrFile] } });
}

beforeEach(() => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: 1,
  });

  global.FileReader = MockFileReader;
  global.Image = MockImage;
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(100 * 100 * 4),
      height: 100,
      width: 100,
    })),
  }));
});

afterEach(() => {
  jest.clearAllMocks();
  global.FileReader = originalFileReader;
  global.Image = originalImage;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: originalMaxTouchPoints,
  });
});

describe("PaymentForm QR scanner", () => {
  it("loads a Lightning invoice and shows a success toast when a valid QR is scanned", async () => {
    jsQR.mockReturnValue({ data: "lightning:lnbc1000n1pj9h8uqpp5test" });

    const { container, onInvoiceChange } = renderPaymentForm();
    scanQrFile(container);

    await waitFor(() => {
      expect(onInvoiceChange).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      expect(addToast).toHaveBeenCalledWith({
        title: "payments.send.qrScannedTitle",
        description: "payments.send.qrScannedDescription",
        color: "success",
      });
    });
  });

  it("shows a localized error toast when the QR is not a Lightning invoice", async () => {
    jsQR.mockReturnValue({ data: "bitcoin:bc1qinvalid" });

    const { container, onInvoiceChange } = renderPaymentForm();
    scanQrFile(container);

    await waitFor(() => {
      expect(onInvoiceChange).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith({
        title: "payments.send.qrInvalidTitle",
        description: "payments.send.qrInvalidDescription",
        color: "danger",
      });
    });
  });

  it("shows a localized error toast when no QR code is found", async () => {
    jsQR.mockReturnValue(null);

    const { container, onInvoiceChange } = renderPaymentForm();
    scanQrFile(container);

    await waitFor(() => {
      expect(onInvoiceChange).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith({
        title: "payments.send.qrScanFailedTitle",
        description: "payments.send.qrScanFailedDescription",
        color: "danger",
      });
    });
  });
});
