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
    timezone: "Europe/Madrid",
    businessLogo: null,
  };

  beforeEach(() => {
    mockOnEdit.mockClear();
  });

  it("renders summary information correctly", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step4.title")).toBeInTheDocument();
    expect(screen.getByText("step4.subtitle")).toBeInTheDocument();

    expect(screen.getByText(baseData.businessName)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessAddress)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessPhone)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessEmail)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessRFC)).toBeInTheDocument();
    expect(screen.getByText(baseData.businessCurrency)).toBeInTheDocument();
    expect(screen.getByText(baseData.timezone)).toBeInTheDocument();
  });

  it("calls onEdit with correct step index", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    const buttons = screen.getAllByRole("button");
    await act(async () => fireEvent.click(buttons[0]));
    expect(mockOnEdit).toHaveBeenCalledWith(1);

    await act(async () => fireEvent.click(buttons[1]));
    expect(mockOnEdit).toHaveBeenCalledWith(2);

    await act(async () => fireEvent.click(buttons[2]));
    expect(mockOnEdit).toHaveBeenCalledWith(3);

    await act(async () => fireEvent.click(buttons[3]));
    expect(mockOnEdit).toHaveBeenCalledWith(5);
  });

  it("shows masked password correctly", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    const masked = "*".repeat(baseData.userPassword.length);
    expect(screen.getByText(`step4.sections.adminAccount.password: ${masked}`)).toBeInTheDocument();
  });

  it("shows the remote phoenixd summary line with the url when configured", async () => {
    const dataWithPhoenixdRemote = {
      ...baseData,
      walletBackend: "phoenixd",
      phoenixdRemote: true,
      phoenixdUrl: "http://100.1.1.1:9740",
    };

    await act(async () => {
      render(<WizardSummary onboardingData={dataWithPhoenixdRemote} onEdit={mockOnEdit} />);
    });

    expect(document.body.textContent).toContain("step4.sections.walletBackend.phoenixdRemote");
    expect(document.body.textContent).toContain("http://100.1.1.1:9740");
  });

  it("does not show the remote phoenixd summary line when not configured", async () => {
    const dataWithLocalPhoenixd = { ...baseData, walletBackend: "phoenixd", phoenixdRemote: false };

    await act(async () => {
      render(<WizardSummary onboardingData={dataWithLocalPhoenixd} onEdit={mockOnEdit} />);
    });

    expect(screen.queryByText("step4.sections.walletBackend.phoenixdRemote")).not.toBeInTheDocument();
  });

  it("shows secrets encryption as active when the admin chose to activate it", async () => {
    const dataWithSecretsEncryption = { ...baseData, activateSecretsEncryption: true };

    await act(async () => {
      render(<WizardSummary onboardingData={dataWithSecretsEncryption} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step4.sections.secretsEncryption.active")).toBeInTheDocument();
    expect(screen.queryByText("step4.sections.secretsEncryption.inactive")).not.toBeInTheDocument();
  });

  it("shows secrets encryption as inactive when the admin did not activate it", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step4.sections.secretsEncryption.inactive")).toBeInTheDocument();
    expect(screen.queryByText("step4.sections.secretsEncryption.active")).not.toBeInTheDocument();
  });

  it("shows the profession row and the professional name label when the business type is freelance", async () => {
    const freelanceData = { ...baseData, businessType: "freelance", businessProfession: "Graphic Designer" };

    await act(async () => {
      render(<WizardSummary onboardingData={freelanceData} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step4.sections.businessType.freelance")).toBeInTheDocument();
    expect(screen.getByText("step3.fields.businessrNameLabelFreelance")).toBeInTheDocument();
    expect(screen.getByText("step4.sections.businessDetails.businessProfession")).toBeInTheDocument();
    expect(screen.getByText("Graphic Designer")).toBeInTheDocument();
  });

  it("shows the store name label for a store business type", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    expect(screen.getByText("step3.fields.businessrNameLabelStore")).toBeInTheDocument();
  });

  it("does not show the profession row for non-freelance business types", async () => {
    await act(async () => {
      render(<WizardSummary onboardingData={baseData} onEdit={mockOnEdit} />);
    });

    expect(screen.queryByText("step4.sections.businessDetails.businessProfession")).not.toBeInTheDocument();
  });

  it("renders the store logo if provided", async () => {
    const file = new File(["fake"], "logo.png", { type: "image/png" });
    const dataWithLogo = { ...baseData, businessLogo: file };

    await act(async () => {
      render(<WizardSummary onboardingData={dataWithLogo} onEdit={mockOnEdit} />);
    });

    const logo = screen.getByAltText("Business logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "blob:mock-url");
  });
});
