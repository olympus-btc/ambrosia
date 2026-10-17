import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n/I18nProvider";
import { getInitialSetupStatus } from "@services/initialSetupService";

import { Onboarding } from "../Onboarding";

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

jest.mock("@services/initialSetupService", () => ({
  getInitialSetupStatus: jest.fn(() => (
    Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ initialized: false, needsBusinessType: false })) })
  )),
  restoreFromBackup: jest.fn(),
}));

const mockHandleComplete = jest.fn();
let mockIsSubmittingSetup = false;

jest.mock("../hooks/useOnboardingSubmit", () => ({
  useOnboardingSubmit: () => ({
    handleComplete: mockHandleComplete,
    isSubmittingSetup: mockIsSubmittingSetup,
  }),
}));

function makeStatusResponse(statusBody) {
  return { status: 200, text: () => Promise.resolve(JSON.stringify(statusBody)) };
}

function renderOnboarding() {
  return render(
    <I18nProvider>
      <Onboarding />
    </I18nProvider>,
  );
}

async function navigateToStep(button, targetStep) {
  for (let i = 1; i < targetStep; i++) {
    await act(async () => {
      fireEvent.click(button);
    });
  }
}

async function navigateToWalletBackendStep() {
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userNamePlaceholder"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userPinPlaceholder"), { target: { value: "0000" } });
    fireEvent.change(screen.getByPlaceholderText("step2.fields.passwordPlaceholder"), { target: { value: "Abcd123$" } });
    fireEvent.change(screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder"), { target: { value: "Abcd123$" } });
  });
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("step3.fields.businessNamePlaceholder"), { target: { value: "My Business" } });
  });
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });
}

async function navigateToSecretsEncryptionStep() {
  await navigateToWalletBackendStep();

  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });
}

async function navigateToSummary() {
  await navigateToSecretsEncryptionStep();

  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });
}

const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  mockHandleComplete.mockClear();
  mockIsSubmittingSetup = false;
});

describe("Onboarding Wizard", () => {
  it("renders the first step", async () => {
    await act(async () => {
      renderOnboarding();
    });
    expect(screen.getByText("buttons.next")).toBeInTheDocument();
    expect(screen.getByText("1")).toHaveClass("bg-green-800");
  });

  it("advances to the next step when Next is clicked", async () => {
    await act(async () => {
      renderOnboarding();
    });
    const storeButton = screen.getByLabelText("store");
    await act(async () => {
      fireEvent.click(storeButton);
    });
    const nextButton = screen.getByText("buttons.next");
    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByText("2")).toHaveClass("bg-green-800");
  });

  it("goes back when Back is clicked", async () => {
    await act(async () => {
      renderOnboarding();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("buttons.next"));
    });
    const backButton = screen.getByText("buttons.back");
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(screen.getByText("1")).toHaveClass("bg-green-800");
  });

  it("disables Back on first step", async () => {
    await act(async () => {
      renderOnboarding();
    });
    expect(screen.queryByText("buttons.back")).not.toBeInTheDocument();
  });

  it("disables the Next button if Pin not added", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await navigateToStep(nextButton, 2);

    const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
    await act(async () => {
      fireEvent.change(userNameInput, { target: { value: "testuser" } });
    });

    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");
    const confirmPasswordInput = screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "abc123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "abc123" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcdef12" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcdef12" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcd123$" } });
    });
    expect(nextButton).toBeDisabled();
  });

  it("disables the Next button if password does not meet requirements in step 2", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await navigateToStep(nextButton, 2);

    const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
    await act(async () => {
      fireEvent.change(userNameInput, { target: { value: "testuser" } });
    });

    const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: "0000" } });
    });

    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");
    const confirmPasswordInput = screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "abc123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "abc123" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcdef12" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcdef12" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcd123$" } });
    });
    expect(nextButton).not.toBeDisabled();
  });

  it("disables the Next button if passwords do not match in step 2", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await navigateToStep(nextButton, 2);

    const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
    const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");
    const confirmPasswordInput = screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder");

    await act(async () => {
      fireEvent.change(userNameInput, { target: { value: "testuser" } });
      fireEvent.change(userPinInput, { target: { value: "0000" } });
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Different123$" } });
    });

    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcd123$" } });
    });

    expect(nextButton).not.toBeDisabled();
  });

  describe("LanguageSwitcher", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("renders the language switcher button", async () => {
      await act(async () => {
        renderOnboarding();
      });

      expect(screen.getByText("Cambiar a Español")).toBeInTheDocument();
    });

    it("switches from English to Spanish when clicked", async () => {
      const user = userEvent.setup();
      await act(async () => {
        renderOnboarding();
      });

      const switcher = screen.getByText("Cambiar a Español");
      await user.click(switcher);

      await waitFor(() => {
        expect(screen.getByText("Switch to English")).toBeInTheDocument();
      });
    });

    it("switches back to English when clicked again", async () => {
      const user = userEvent.setup();
      await act(async () => {
        renderOnboarding();
      });

      await user.click(screen.getByText("Cambiar a Español"));
      await waitFor(() => screen.getByText("Switch to English"));

      await user.click(screen.getByText("Switch to English"));
      await waitFor(() => {
        expect(screen.getByText("Cambiar a Español")).toBeInTheDocument();
      });
    });

    it("persists locale selection in localStorage", async () => {
      const user = userEvent.setup();
      await act(async () => {
        renderOnboarding();
      });

      await user.click(screen.getByText("Cambiar a Español"));

      await waitFor(() => {
        expect(localStorage.getItem("locale")).toBe("es");
      });
    });
  });

  it("Not disables the Next button if RFC are invalid in step 3", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await navigateToStep(nextButton, 2);

    await act(async () => {
      const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
      const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
      const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");
      const confirmPasswordInput = screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder");

      fireEvent.change(userNameInput, { target: { value: "testuser" } });
      fireEvent.change(userPinInput, { target: { value: "0000" } });
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcd123$" } });

      fireEvent.click(nextButton);
    });

    const phoneInput = screen.getByPlaceholderText("step3.fields.businessPhonePlaceholder");
    const rfcInput = screen.getByPlaceholderText("step3.fields.businessRFCPlaceholder");
    const businessNameInput = screen.getByPlaceholderText("step3.fields.businessNamePlaceholder");
    const businessAddressInput = screen.getByPlaceholderText("step3.fields.businessAddressPlaceholder");

    await act(async () => {
      fireEvent.change(businessNameInput, { target: { value: "My Business" } });
      fireEvent.change(businessAddressInput, { target: { value: "123 Main St" } });
    });

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: "12345" } });
    });
    expect(nextButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.change(phoneInput, { target: { value: "5511223344" } });
      fireEvent.change(rfcInput, { target: { value: "ABC123" } });
    });
    expect(nextButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.change(rfcInput, { target: { value: "GODE561231GR8" } });
    });
    expect(nextButton).not.toBeDisabled();
  });

  describe("Restore from backup", () => {
    it("shows the restore toggle link on the first step when setup is not initialized", async () => {
      await act(async () => {
        renderOnboarding();
      });

      expect(screen.getByText("restore.toggleLink")).toBeInTheDocument();
    });

    it("shows the restore step and hides the wizard when the toggle link is clicked", async () => {
      await act(async () => {
        renderOnboarding();
      });

      await act(async () => {
        fireEvent.click(screen.getByText("restore.toggleLink"));
      });

      expect(screen.getByText("restore.title")).toBeInTheDocument();
      expect(screen.queryByText("buttons.next")).not.toBeInTheDocument();
    });

    it("returns to the wizard when Back to setup is clicked from the restore step", async () => {
      await act(async () => {
        renderOnboarding();
      });

      await act(async () => {
        fireEvent.click(screen.getByText("restore.toggleLink"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("buttons.back"));
      });

      expect(screen.getByText("buttons.next")).toBeInTheDocument();
      expect(screen.queryByText("restore.title")).not.toBeInTheDocument();
    });
  });

  describe("submitting the wizard", () => {
    it("calls handleComplete when Finish is pressed", async () => {
      await act(async () => {
        renderOnboarding();
      });
      await navigateToSummary();

      await act(async () => {
        fireEvent.click(screen.getByText("buttons.finish"));
      });

      expect(mockHandleComplete).toHaveBeenCalledTimes(1);
    });

    it("disables and shows loading on Finish while isSubmittingSetup is true", async () => {
      mockIsSubmittingSetup = true;

      await act(async () => {
        renderOnboarding();
      });
      await navigateToSummary();

      expect(screen.getByText("buttons.finish").closest("button")).toBeDisabled();
    });

    it("calls handleComplete when Finish is pressed for a business-type-only setup", async () => {
      getInitialSetupStatus.mockResolvedValueOnce(makeStatusResponse({ initialized: false, needsBusinessType: true }));

      await act(async () => {
        renderOnboarding();
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText("store"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("buttons.finish"));
      });

      expect(mockHandleComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("secrets encryption onboarding step", () => {
    it("shows the secrets encryption step between the wallet backend step and the summary", async () => {
      await act(async () => {
        renderOnboarding();
      });

      await navigateToSecretsEncryptionStep();

      expect(screen.getByText("stepSecretsEncryption.title")).toBeInTheDocument();
    });

    it("reaches the summary as not activated when the admin leaves the checkbox unchecked", async () => {
      await act(async () => {
        renderOnboarding();
      });

      await navigateToSummary();

      expect(screen.getByText("step4.sections.secretsEncryption.inactive")).toBeInTheDocument();
    });

    it("keeps the Next button enabled when the checkbox is checked", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderOnboarding();
      });

      await navigateToSecretsEncryptionStep();
      await user.click(screen.getByRole("checkbox"));

      expect(screen.getByText("buttons.next")).not.toBeDisabled();
    });

    it("shows the wallet password warning once the checkbox is checked", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderOnboarding();
      });

      await navigateToSecretsEncryptionStep();
      await user.click(screen.getByRole("checkbox"));

      expect(screen.getByText("stepSecretsEncryption.walletPasswordWarning")).toBeInTheDocument();
    });
  });
});
