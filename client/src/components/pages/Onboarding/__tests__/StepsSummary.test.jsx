import { render, screen, fireEvent, act } from "@testing-library/react";

import { WizardSummary } from "../StepsSummary";

global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

describe("Step 4 Summary", () => {
  const mockOnEdit = jest.fn();

  const baseData = {
    businessType: "store",
    userName: "Juan",
    userPassword: "Secreto123!",
    businessName: "Tienda La Esperanza",
    businessAddress: "Calle Falsa 123",
    businessPhone: "5551234567",
    businessEmail: "tienda@correo.com",
    businessRFC: "RFC123456ABC",
    businessCurrency: "MXN",
    businessLogo: null,
  };

  beforeEach(() => {
    mockOnEdit.mockClear();
  });

  it("renders summary information correctly", async () => {
    await act(async () => {
      render(<WizardSummary data={baseData} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step4.title")).toBeInTheDocument();
    expect(screen.getByText("step4.subtitle")).toBeInTheDocument();

    expect(screen.getByText(baseData.businessName)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessAddress)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessPhone)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessEmail)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessRFC)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessCurrency)).toBeInTheDocument();
  });

  it("calls onEdit with correct step index", async () => {
    await act(async () => {
      render(<WizardSummary data={baseData} onEdit={mockOnEdit} />);
    });

    const buttons = screen.getAllByRole("button");
    await act(async () => fireEvent.click(buttons[0]));
    expect(mockOnEdit).toHaveBeenCalledWith(1);

    await act(async () => fireEvent.click(buttons[1]));
    expect(mockOnEdit).toHaveBeenCalledWith(2);

    await act(async () => fireEvent.click(buttons[2]));
    expect(mockOnEdit).toHaveBeenCalledWith(3);
  });

  it("shows masked password correctly", async () => {
    await act(async () => {
      render(<WizardSummary data={baseData} onEdit={mockOnEdit} />);
    });

    const masked = "*".repeat(baseData.userPassword.length);
    expect(screen.getByText(`step4.sections.adminAccount.password: ${masked}`)).toBeInTheDocument();
  });

  it("renders the store logo if provided", async () => {
    const file = new File(["fake"], "logo.png", { type: "image/png" });
    const dataWithLogo = { ...baseData, businessLogo: file };

    await act(async () => {
      render(<WizardSummary data={dataWithLogo} onEdit={mockOnEdit} />);
    });

    const logo = screen.getByAltText("Business logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "blob:mock-url");
  });
});
