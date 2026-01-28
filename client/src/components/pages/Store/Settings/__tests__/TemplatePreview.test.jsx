import { render, screen } from "@testing-library/react";

import { TemplatePreview } from "../TicketTemplate/TemplatePreview";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
  Select: ({ children, label, onChange, ...props }) => (
    <div>
      <label>{label}</label>
      <select onChange={onChange} {...props}>
        {children}
      </select>
    </div>
  ),
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

const t = (key) => key;

const defaultProps = {
  previewElements: [],
  printerType: "CUSTOMER",
  onPrinterTypeChange: jest.fn(),
  printerTypes: ["CUSTOMER"],
  onPrintTest: jest.fn(),
  printing: false,
  templateExists: false,
  t,
};

describe("TemplatePreview", () => {
  it("shows empty message when no elements exist", () => {
    render(<TemplatePreview {...defaultProps} />);
    expect(screen.getByText("templates.previewEmpty")).toBeInTheDocument();
  });

  it("renders preview elements when provided", () => {
    render(
      <TemplatePreview
        {...defaultProps}
        previewElements={[<div key="one">Preview Line</div>]}
      />,
    );
    expect(screen.getByText("Preview Line")).toBeInTheDocument();
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
    const button = screen.getByText("templates.printTest");
    expect(button).toBeDisabled();
  });

  it("enables print button when template exists", () => {
    render(<TemplatePreview {...defaultProps} templateExists />);
    const button = screen.getByText("templates.printTest");
    expect(button).not.toBeDisabled();
  });
});
