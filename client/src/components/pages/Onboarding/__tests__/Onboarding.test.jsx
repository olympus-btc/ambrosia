import { addToast } from "@heroui/react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n/I18nProvider";
import { submitInitialSetup } from "@services/initialSetupService";

import { Onboarding } from "../Onboarding";

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

jest.mock("@services/initialSetupService", () => ({
  getInitialSetupStatus: jest.fn(() => Promise.resolve({ initialized: false, needsBusinessType: false })),
  submitInitialSetup: jest.fn(() => Promise.resolve({})),
  restoreFromBackup: jest.fn(),
}));

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

const VALID_PIN = "123456";

const validNwcUri = `nostr+walletconnect://${"a".repeat(64)}?relay=wss://relay.test&secret=${"b".repeat(64)}`;

async function completeOnboardingWithNwcUri(user, nwcUri) {
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userNamePlaceholder"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userPinPlaceholder"), { target: { value: VALID_PIN } });
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

  await user.click(screen.getByText("stepWallet.nwcName"));
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("nostr+walletconnect://..."), {
      target: { value: nwcUri },
    });
  });
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });

  await act(async () => {
    fireEvent.click(screen.getByText("buttons.finish"));
  });
}

async function completeOnboardingWithPhoenixd() {
  await act(async () => {
    fireEvent.click(screen.getByText("buttons.next"));
  });

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userNamePlaceholder"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByPlaceholderText("step2.fields.userPinPlaceholder"), { target: { value: VALID_PIN } });
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

  it("keeps Next disabled until the PIN has exactly 6 digits in step 2", async () => {
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
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Abcd123$" } });
    });

    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: "1234" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: "12345" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: VALID_PIN } });
    });
    expect(nextButton).not.toBeDisabled();
  });

  it("strips non-numeric characters from the PIN and caps it at 6 digits", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await navigateToStep(nextButton, 2);

    const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: "12ab34cd" } });
    });
    expect(userPinInput).toHaveValue("1234");
    expect(userPinInput).toHaveAttribute("maxLength", "6");
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
      fireEvent.change(userPinInput, { target: { value: "000000" } });
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
      fireEvent.change(userPinInput, { target: { value: "000000" } });
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
      fireEvent.change(userPinInput, { target: { value: "000000" } });
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

  describe("NWC onboarding result toast", () => {
    it("shows the NWC activated toast when the backend connects successfully", async () => {
      submitInitialSetup.mockResolvedValueOnce({
        json: () => Promise.resolve({ nwcSaved: true }),
      });
      const user = userEvent.setup();

      await act(async () => {
        renderOnboarding();
      });

      await completeOnboardingWithNwcUri(user, validNwcUri);

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "submitOnboardingToast.nwcSavedTitle", color: "primary" }),
        );
      });
    });

    it("shows an error toast when the NWC backend could not be connected", async () => {
      submitInitialSetup.mockResolvedValueOnce({
        json: () => Promise.resolve({ nwcSaved: false }),
      });
      const user = userEvent.setup();

      await act(async () => {
        renderOnboarding();
      });

      await completeOnboardingWithNwcUri(user, validNwcUri);

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "submitOnboardingToast.nwcErrorTitle", color: "danger" }),
        );
      });
    });
  });

  describe("timezone", () => {
    it("sends the browser-detected timezone in the setup payload", async () => {
      await act(async () => {
        renderOnboarding();
      });
      await completeOnboardingWithPhoenixd();

      await act(async () => {
        fireEvent.click(screen.getByText("buttons.finish"));
      });

      await waitFor(() => {
        expect(submitInitialSetup).toHaveBeenCalledWith(
          expect.objectContaining({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        );
      });
    });
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

  describe("setup submit feedback", () => {
    it("shows a localized error toast when setup submission fails", async () => {
      submitInitialSetup.mockRejectedValueOnce(new Error("Server unavailable"));

      await act(async () => {
        renderOnboarding();
      });
      await completeOnboardingWithPhoenixd();

      await act(async () => {
        fireEvent.click(screen.getByText("buttons.finish"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "submitOnboardingToast.errorTitle",
          description: "Server unavailable",
          color: "danger",
        }),
      );
    });

    it("prevents duplicate setup submissions while finish is pending", async () => {
      let resolveSetupSubmission;
      submitInitialSetup.mockImplementationOnce(() => new Promise((resolveSetup) => {
        resolveSetupSubmission = resolveSetup;
      }));

      await act(async () => {
        renderOnboarding();
      });
      await completeOnboardingWithPhoenixd();
      submitInitialSetup.mockClear();

      const finishButton = screen.getByText("buttons.finish");
      await act(async () => {
        fireEvent.click(finishButton);
        fireEvent.click(finishButton);
      });

      expect(submitInitialSetup).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSetupSubmission({});
      });
    });
  });
});
