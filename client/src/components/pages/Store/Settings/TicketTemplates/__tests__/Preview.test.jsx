import { render, screen } from "@testing-library/react";

import { TemplatePreview } from "../Preview";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
  Select: ({ children, label, onChange, selectedKeys, ...props }) => (
    <div>
      <label>{label}</label>
      <select onChange={onChange} {...props}>
        {children}
      </select>
    </div>
  ),
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

jest.mock("../TicketElements", () => ({
  TicketElementsPreview: ({ elements }) => (
    <div data-testid="elements-preview" data-count={elements.length} />
  ),
}));

const t = (key) => key;

const defaultProps = {
  elements: [],
  config: null,
  printerType: "CUSTOMER",
  onPrinterTypeChange: jest.fn(),
  printerTypes: ["CUSTOMER"],
  onPrintTest: jest.fn(),
  printing: false,
  templateExists: false,
  t,
};

describe("TemplatePreview", () => {
  it("shows empty message when no elements", () => {
    render(<TemplatePreview {...defaultProps} />);
    expect(screen.getByText("templates.previewEmpty")).toBeInTheDocument();
  });

  it("renders TicketElementsPreview when elements are provided", () => {
    render(
      <TemplatePreview
        {...defaultProps}
        elements={[{ localId: "e-1", type: "TEXT", value: "Hi", style: {} }]}
      />,
    );
    expect(screen.getByTestId("elements-preview")).toBeInTheDocument();
    expect(screen.queryByText("templates.previewEmpty")).not.toBeInTheDocument();
  });

  it("shows printer type select and print test button", () => {
    render(<TemplatePreview {...defaultProps} />);
    expect(screen.getByText("templates.printTypeLabel")).toBeInTheDocument();
    expect(screen.getByText("templates.printTest")).toBeInTheDocument();
  });

  it("shows printing state when printing", () => {
    render(<TemplatePreview {...defaultProps} printing />);
    expect(screen.getByText("templates.printing")).toBeInTheDocument();
  });

  it("disables print button when template does not exist", () => {
    render(<TemplatePreview {...defaultProps} templateExists={false} />);
    expect(screen.getByText("templates.printTest")).toBeDisabled();
  });

  it("enables print button when template exists", () => {
    render(<TemplatePreview {...defaultProps} templateExists />);
    expect(screen.getByText("templates.printTest")).not.toBeDisabled();
  });
});
