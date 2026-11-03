import { render, screen } from "@testing-library/react";

import { TicketElementsPreview } from "../TicketElements";

import { previewSampleTicket } from "./utils/previewSampleTicket";

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ value: qrValue }) => <svg data-testid="qr-code" data-value={qrValue} />,
}));

const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
  businessEmail: "contact@ambrosia.mx",
};

function Preview({ templateElements, businessConfig }) {
  return <div>{TicketElementsPreview({ templateElements, businessConfig, sampleTicket: previewSampleTicket })}</div>;
}

describe("TicketElementsPreview", () => {
  it("returns null for non-array input", () => {
    const { container: previewContainer } = render(<Preview templateElements={null} businessConfig={null} />);
    expect(previewContainer.firstChild.children).toHaveLength(0);
  });

  it("returns null for empty elements", () => {
    const { container: previewContainer } = render(<Preview templateElements={[]} businessConfig={null} />);
    expect(previewContainer.firstChild.children).toHaveLength(0);
  });

  it("renders SEPARATOR as a dashed horizontal line", () => {
    const { container: previewContainer } = render(
      <Preview templateElements={[{ localId: "s-1", type: "SEPARATOR", style: {} }]} businessConfig={null} />,
    );
    expect(previewContainer.querySelector(".border-dashed")).toBeInTheDocument();
  });

  it("renders LINE_BREAK as a spacer", () => {
    const { container: previewContainer } = render(
      <Preview templateElements={[{ localId: "b-1", type: "LINE_BREAK", style: {} }]} businessConfig={null} />,
    );
    expect(previewContainer.querySelector(".h-3")).toBeInTheDocument();
  });

  it("renders QRCODE with a QR code and invoice fallback", () => {
    render(
      <Preview templateElements={[{ localId: "q-1", type: "QRCODE", value: "", style: {} }]} businessConfig={null} />,
    );
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();
  });

  it("renders QRCODE with the selected size and alignment", () => {
    render(
      <Preview
        templateElements={[{
          localId: "q-3",
          type: "QRCODE",
          value: "https://instagram.com/bob",
          style: { fontSize: "EXTRA_LARGE", justification: "RIGHT" },
        }]}
        businessConfig={null}
      />,
    );
    const qrPreview = screen.getByTestId("qr-preview");
    expect(qrPreview).toHaveClass("w-[56%]");
    expect(qrPreview.parentElement).toHaveClass("items-end");
  });

  it("renders QRCODE with resolved value when provided", () => {
    render(
      <Preview
        templateElements={[{ localId: "q-2", type: "QRCODE", value: "{{config.businessName}}", style: {} }]}
        businessConfig={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders LOGO with the business logo", () => {
    render(
      <Preview
        templateElements={[{ localId: "l-1", type: "LOGO", value: "", style: { fontSize: "LARGE" } }]}
        businessConfig={{ businessLogoUrl: "/uploads/2026-10/alice.png" }}
      />,
    );
    const logoPreview = screen.getByTestId("logo-preview");
    expect(logoPreview).toHaveClass("w-1/2");
    expect(logoPreview.querySelector("img")).toHaveAttribute("src", "/uploads/2026-10/alice.png");
  });

  it("renders TABLE_ROW with sample ticket items and comments", () => {
    render(
      <Preview templateElements={[{ localId: "t-1", type: "TABLE_ROW", style: {} }]} businessConfig={null} />,
    );
    expect(screen.getByText("2x Pina colada")).toBeInTheDocument();
    expect(screen.getByText("1x Limonada")).toBeInTheDocument();
    expect(screen.getByText("- sin azucar")).toBeInTheDocument();
  });

  it("renders TOTAL_ROW with separator, label and total", () => {
    const { container: previewContainer } = render(
      <Preview templateElements={[{ localId: "r-1", type: "TOTAL_ROW", value: "", style: {} }]} businessConfig={null} />,
    );
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
    expect(screen.getByText("215")).toBeInTheDocument();
    expect(previewContainer.querySelector(".border-t")).toBeInTheDocument();
  });

  it("renders TOTAL_ROW with resolved label", () => {
    render(
      <Preview
        templateElements={[{ localId: "r-2", type: "TOTAL_ROW", value: "{{config.businessName}}", style: {} }]}
        businessConfig={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders PAYMENT_METHOD with its label and the sample payment method without accents", () => {
    render(
      <Preview templateElements={[{ localId: "pm-1", type: "PAYMENT_METHOD", value: "Método de pago", style: {} }]} businessConfig={null} />,
    );
    expect(screen.getByText("Metodo de pago")).toBeInTheDocument();
    expect(screen.getByText("Tarjeta de debito")).toBeInTheDocument();
  });

  it("renders PAYMENT_METHOD with the translated default label when it has no label", () => {
    render(
      <Preview templateElements={[{ localId: "pm-2", type: "PAYMENT_METHOD", value: "", style: {} }]} businessConfig={null} />,
    );
    expect(screen.getByText("METODO DE PAGO")).toBeInTheDocument();
  });

  it("renders TEXT with resolved value", () => {
    render(
      <Preview
        templateElements={[{ localId: "tx-1", type: "TEXT", value: "{{config.businessName}}", style: {} }]}
        businessConfig={sampleConfig}
      />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders TOTAL_ROW with the translated default label", () => {
    render(
      <Preview
        templateElements={[{ localId: "r-3", type: "TOTAL_ROW", value: "", style: {} }]}
        businessConfig={null}
      />,
    );
    expect(screen.getByText(previewSampleTicket.labels.total)).toBeInTheDocument();
  });

  it("renders TEXT without accents like the printer", () => {
    render(
      <Preview
        templateElements={[{ localId: "tx-3", type: "TEXT", value: "Gracias por tu visita al Salón", style: {} }]}
        businessConfig={null}
      />,
    );
    expect(screen.getByText("Gracias por tu visita al Salon")).toBeInTheDocument();
  });

  it("applies bold style", () => {
    const { container: previewContainer } = render(
      <Preview
        templateElements={[{ localId: "tx-2", type: "TEXT", value: "Bold", style: { bold: true, justification: "LEFT", fontSize: "NORMAL" } }]}
        businessConfig={null}
      />,
    );
    expect(previewContainer.querySelector(".font-semibold")).toBeInTheDocument();
  });

  it("applies center alignment", () => {
    const { container: previewContainer } = render(
      <Preview
        templateElements={[{ localId: "tx-3", type: "TEXT", value: "C", style: { bold: false, justification: "CENTER", fontSize: "NORMAL" } }]}
        businessConfig={null}
      />,
    );
    expect(previewContainer.querySelector(".text-center")).toBeInTheDocument();
  });

  it("applies right alignment", () => {
    const { container: previewContainer } = render(
      <Preview
        templateElements={[{ localId: "tx-4", type: "TEXT", value: "R", style: { bold: false, justification: "RIGHT", fontSize: "NORMAL" } }]}
        businessConfig={null}
      />,
    );
    expect(previewContainer.querySelector(".text-right")).toBeInTheDocument();
  });

  it("applies LARGE font size", () => {
    render(
      <Preview
        templateElements={[{ localId: "tx-5", type: "TEXT", value: "L", style: { bold: false, justification: "LEFT", fontSize: "LARGE" } }]}
        businessConfig={null}
      />,
    );
    expect(screen.getByText("L")).toHaveClass("text-[length:calc(100cqw/14.5)]");
  });

  it("applies EXTRA_LARGE font size", () => {
    render(
      <Preview
        templateElements={[{ localId: "tx-6", type: "TEXT", value: "XL", style: { bold: false, justification: "LEFT", fontSize: "EXTRA_LARGE" } }]}
        businessConfig={null}
      />,
    );
    expect(screen.getByText("XL")).toHaveClass("text-[length:calc(100cqw/9.7)]");
  });

  it("falls back to DEFAULT_STYLE when no style is provided", () => {
    const { container: previewContainer } = render(
      <Preview templateElements={[{ localId: "tx-7", type: "TEXT", value: "No style" }]} businessConfig={null} />,
    );
    expect(previewContainer.querySelector(".text-left")).toBeInTheDocument();
    expect(previewContainer.querySelector(".font-normal")).toBeInTheDocument();
    expect(screen.getByText("No style")).toHaveClass("text-[length:calc(100cqw/29)]");
  });
});
