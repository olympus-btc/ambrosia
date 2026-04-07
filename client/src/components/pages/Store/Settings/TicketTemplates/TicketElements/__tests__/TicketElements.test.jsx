import { render, screen } from "@testing-library/react";

import { TicketElementsPreview } from "../TicketElements";

const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
  businessEmail: "contact@ambrosia.mx",
};

function Preview({ elements, config }) {
  return <div>{TicketElementsPreview({ elements, config })}</div>;
}

describe("TicketElementsPreview", () => {
  it("returns null for non-array input", () => {
    const { container } = render(<Preview elements={null} config={null} />);
    expect(container.firstChild.children).toHaveLength(0);
  });

  it("returns null for empty elements", () => {
    const { container } = render(<Preview elements={[]} config={null} />);
    expect(container.firstChild.children).toHaveLength(0);
  });

  it("renders SEPARATOR as a dashed horizontal line", () => {
    const { container } = render(
      <Preview elements={[{ localId: "s-1", type: "SEPARATOR", style: {} }]} config={null} />,
    );
    expect(container.querySelector(".border-dashed")).toBeInTheDocument();
  });

  it("renders LINE_BREAK as a spacer", () => {
    const { container } = render(
      <Preview elements={[{ localId: "b-1", type: "LINE_BREAK", style: {} }]} config={null} />,
    );
    expect(container.querySelector(".h-3")).toBeInTheDocument();
  });

  it("renders QRCODE with QR placeholder and invoice fallback", () => {
    render(
      <Preview elements={[{ localId: "q-1", type: "QRCODE", value: "", style: {} }]} config={null} />,
    );
    expect(screen.getByText("QR")).toBeInTheDocument();
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();
  });

  it("renders QRCODE with resolved value when provided", () => {
    render(
      <Preview
        elements={[{ localId: "q-2", type: "QRCODE", value: "{{config.businessName}}", style: {} }]}
        config={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders TABLE_ROW with sample ticket items and comments", () => {
    render(
      <Preview elements={[{ localId: "t-1", type: "TABLE_ROW", style: {} }]} config={null} />,
    );
    expect(screen.getByText("2x Tacos al pastor")).toBeInTheDocument();
    expect(screen.getByText("1x Agua fresca")).toBeInTheDocument();
    expect(screen.getByText("- sin cebolla")).toBeInTheDocument();
  });

  it("renders TOTAL_ROW with separator, label and total", () => {
    const { container } = render(
      <Preview elements={[{ localId: "r-1", type: "TOTAL_ROW", value: "", style: {} }]} config={null} />,
    );
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
    expect(screen.getByText("215")).toBeInTheDocument();
    expect(container.querySelector(".border-t")).toBeInTheDocument();
  });

  it("renders TOTAL_ROW with resolved label", () => {
    render(
      <Preview
        elements={[{ localId: "r-2", type: "TOTAL_ROW", value: "{{config.businessName}}", style: {} }]}
        config={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders TEXT with resolved value", () => {
    render(
      <Preview
        elements={[{ localId: "tx-1", type: "TEXT", value: "{{config.businessName}}", style: {} }]}
        config={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("applies bold style", () => {
    const { container } = render(
      <Preview
        elements={[{ localId: "tx-2", type: "TEXT", value: "Bold", style: { bold: true, justification: "LEFT", fontSize: "NORMAL" } }]}
        config={null}
      />,
    );
    expect(container.querySelector(".font-semibold")).toBeInTheDocument();
  });

  it("applies center alignment", () => {
    const { container } = render(
      <Preview
        elements={[{ localId: "tx-3", type: "TEXT", value: "C", style: { bold: false, justification: "CENTER", fontSize: "NORMAL" } }]}
        config={null}
      />,
    );
    expect(container.querySelector(".text-center")).toBeInTheDocument();
  });

  it("applies right alignment", () => {
    const { container } = render(
      <Preview
        elements={[{ localId: "tx-4", type: "TEXT", value: "R", style: { bold: false, justification: "RIGHT", fontSize: "NORMAL" } }]}
        config={null}
      />,
    );
    expect(container.querySelector(".text-right")).toBeInTheDocument();
  });

  it("applies LARGE font size", () => {
    const { container } = render(
      <Preview
        elements={[{ localId: "tx-5", type: "TEXT", value: "L", style: { bold: false, justification: "LEFT", fontSize: "LARGE" } }]}
        config={null}
      />,
    );
    expect(container.querySelector(".text-base")).toBeInTheDocument();
  });

  it("applies EXTRA_LARGE font size", () => {
    const { container } = render(
      <Preview
        elements={[{ localId: "tx-6", type: "TEXT", value: "XL", style: { bold: false, justification: "LEFT", fontSize: "EXTRA_LARGE" } }]}
        config={null}
      />,
    );
    expect(container.querySelector(".text-lg")).toBeInTheDocument();
  });

  it("falls back to DEFAULT_STYLE when no style is provided", () => {
    const { container } = render(
      <Preview elements={[{ localId: "tx-7", type: "TEXT", value: "No style" }]} config={null} />,
    );
    expect(container.querySelector(".text-left")).toBeInTheDocument();
    expect(container.querySelector(".font-normal")).toBeInTheDocument();
    expect(container.querySelector(".text-sm")).toBeInTheDocument();
  });
});
