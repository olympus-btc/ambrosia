import { render, screen, fireEvent, act } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { Onboarding } from "../Onboarding";

jest.mock("@services/initialSetupService", () => ({
  getInitialSetupStatus: jest.fn(() => Promise.resolve({ initialized: false, needsBusinessType: false })),
  submitInitialSetup: jest.fn(() => Promise.resolve({})),
}));

function renderOnboarding() {
  return render(
    <I18nProvider>
      <Onboarding />
    </I18nProvider>,
  );
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
    expect(screen.getByText("1")).toHaveClass("bg-primary");
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

    expect(screen.getByText("2")).toHaveClass("bg-primary");
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

    expect(screen.getByText("1")).toHaveClass("bg-primary");
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
    await act(async () => {
      fireEvent.click(nextButton);
    });

    const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
    await act(async () => {
      fireEvent.change(userNameInput, { target: { value: "testuser" } });
    });

    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "abc123" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcdef12" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
    });
    expect(nextButton).toBeDisabled();
  });

  it("disables the Next button if password does not meet requirements in step 2", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await act(async () => {
      fireEvent.click(nextButton);
    });

    const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
    await act(async () => {
      fireEvent.change(userNameInput, { target: { value: "testuser" } });
    });

    const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
    await act(async () => {
      fireEvent.change(userPinInput, { target: { value: "0000" } });
    });

    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "abc123" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcdef12" } });
    });
    expect(nextButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });
    });
    expect(nextButton).not.toBeDisabled();
  });

  it("Not disables the Next button if RFC are invalid in step 3", async () => {
    await act(async () => {
      renderOnboarding();
    });

    const nextButton = screen.getByText("buttons.next");
    await act(async () => {
      fireEvent.click(nextButton);
    });

    await act(async () => {
      const userNameInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");
      const userPinInput = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");
      const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");

      fireEvent.change(userNameInput, { target: { value: "testuser" } });
      fireEvent.change(userPinInput, { target: { value: "0000" } });
      fireEvent.change(passwordInput, { target: { value: "Abcd123$" } });

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
});
