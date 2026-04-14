import { render, screen } from "@testing-library/react";

import { ElementQrCode } from "../ElementQrCode";

const config = { businessName: "Ambrosia" };

describe("ElementQrCode", () => {
  it("shows QR placeholder box", () => {
    render(<ElementQrCode value="" config={null} className="" />);
    expect(screen.getByText("QR")).toBeInTheDocument();
  });

  it("falls back to sample invoice when value is empty", () => {
    render(<ElementQrCode value="" config={null} className="" />);
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();
  });

  it("shows resolved value when provided", () => {
    render(
      <ElementQrCode value="{{config.businessName}}" config={config} className="" />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("applies className to container", () => {
    const { container } = render(
      <ElementQrCode value="" config={null} className="text-center" />,
    );
    expect(container.querySelector(".text-center")).toBeInTheDocument();
  });
});
