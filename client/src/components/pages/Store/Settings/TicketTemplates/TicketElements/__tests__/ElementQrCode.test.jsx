import { render, screen } from "@testing-library/react";

import { ElementQrCode } from "../ElementQrCode";

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ value }) => <svg data-testid="qr-code" data-value={value} />,
}));

const businessConfig = { businessName: "Ambrosia" };

describe("ElementQrCode", () => {
  it("renders a QR code for the resolved value", () => {
    render(<ElementQrCode templateText="https://instagram.com/alice" businessConfig={null} className="" />);
    expect(screen.getByTestId("qr-code")).toHaveAttribute("data-value", "https://instagram.com/alice");
  });

  it("falls back to sample invoice when value is empty", () => {
    render(<ElementQrCode templateText="" businessConfig={null} className="" />);
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();
  });

  it("shows resolved value when provided", () => {
    render(
      <ElementQrCode templateText="{{config.businessName}}" businessConfig={businessConfig} className="" />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("applies className to container", () => {
    const { container } = render(
      <ElementQrCode templateText="" businessConfig={null} className="text-center" />,
    );
    expect(container.querySelector(".text-center")).toBeInTheDocument();
  });

  it.each([
    ["NORMAL", "w-[28%]"],
    ["LARGE", "w-[42%]"],
    ["EXTRA_LARGE", "w-[56%]"],
  ])("sizes the QR preview for %s", (fontSize, expectedWidthClass) => {
    render(<ElementQrCode templateText="" businessConfig={null} fontSize={fontSize} className="" />);
    expect(screen.getByTestId("qr-preview")).toHaveClass(expectedWidthClass);
  });

  it("uses the smallest QR preview when the size is missing", () => {
    render(<ElementQrCode templateText="" businessConfig={null} className="" />);
    expect(screen.getByTestId("qr-preview")).toHaveClass("w-[28%]");
  });

  it.each([
    ["LEFT", "items-start"],
    ["CENTER", "items-center"],
    ["RIGHT", "items-end"],
  ])("aligns the QR preview for %s", (justification, expectedAlignmentClass) => {
    const { container } = render(
      <ElementQrCode templateText="" businessConfig={null} justification={justification} className="" />,
    );
    expect(container.firstChild).toHaveClass(expectedAlignmentClass);
  });
});
