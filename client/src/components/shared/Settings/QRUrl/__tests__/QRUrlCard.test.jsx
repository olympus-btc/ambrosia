import { render, screen } from "@testing-library/react";

import { QRUrlCard } from "../QRUrlCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ "aria-label": ariaLabel, value }) => (
    <svg aria-label={ariaLabel} data-testid="qr-code" data-value={value} />
  ),
}));

describe("QRUrlCard", () => {
  it("renders a QR code for the current origin", async () => {
    render(<QRUrlCard />);

    const qrCode = await screen.findByTestId("qr-code");
    expect(qrCode).toHaveAttribute("data-value", window.location.origin);
    expect(qrCode).toHaveAttribute("aria-label", "cardQRUrl.qrLabel");
  });
});
