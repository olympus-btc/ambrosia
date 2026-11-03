import { render, screen, fireEvent } from "@testing-library/react";

import { SecretsRememberPasswordCheckbox } from "../SecretsRememberPasswordCheckbox";

let mockIsElectron = false;
jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

jest.mock("@/hooks/usePermission");

jest.mock("@heroui/react", () => ({
  Checkbox: ({ isSelected, onValueChange, isDisabled, children }) => (
    <label>
      <input
        type="checkbox"
        checked={isSelected}
        disabled={isDisabled}
        onChange={(event) => onValueChange(event.target.checked)}
      />
      {children}
    </label>
  ),
  Tooltip: ({ content, isDisabled, children }) => (
    <div>
      {!isDisabled && <span data-testid="remember-tooltip-content">{content}</span>}
      {children}
    </div>
  ),
}));

function renderCheckbox(props = {}) {
  return render(
    <SecretsRememberPasswordCheckbox
      storageBackend={null}
      rememberUnlockPassword={false}
      onRememberUnlockPasswordChange={jest.fn()}
      {...props}
    />,
  );
}

describe("SecretsRememberPasswordCheckbox", () => {
  beforeEach(() => {
    mockIsElectron = false;
  });

  it("renders nothing outside Electron", () => {
    renderCheckbox({ storageBackend: "gnome-libsecret" });

    expect(screen.queryByText("secretsEncryptionCard.rememberOnThisDevice")).not.toBeInTheDocument();
  });

  it("renders disabled without a tooltip while the storage backend is still unknown", () => {
    mockIsElectron = true;
    renderCheckbox({ storageBackend: null });

    expect(screen.getByLabelText("secretsEncryptionCard.rememberOnThisDevice")).toBeDisabled();
    expect(screen.queryByTestId("remember-tooltip-content")).not.toBeInTheDocument();
  });

  it("renders enabled when a working keyring backend is available", () => {
    mockIsElectron = true;
    renderCheckbox({ storageBackend: "gnome-libsecret" });

    expect(screen.getByLabelText("secretsEncryptionCard.rememberOnThisDevice")).not.toBeDisabled();
    expect(screen.queryByTestId("remember-tooltip-content")).not.toBeInTheDocument();
  });

  it("renders disabled with a tooltip when no secure backend is available", () => {
    mockIsElectron = true;
    renderCheckbox({ storageBackend: "basic_text" });

    expect(screen.getByLabelText("secretsEncryptionCard.rememberOnThisDevice")).toBeDisabled();
    expect(screen.getByTestId("remember-tooltip-content")).toHaveTextContent(
      "secretsEncryptionCard.rememberUnavailableTooltip",
    );
  });

  it("calls onRememberUnlockPasswordChange when toggled", () => {
    mockIsElectron = true;
    const onRememberUnlockPasswordChange = jest.fn();
    renderCheckbox({ storageBackend: "gnome-libsecret", onRememberUnlockPasswordChange });

    fireEvent.click(screen.getByLabelText("secretsEncryptionCard.rememberOnThisDevice"));

    expect(onRememberUnlockPasswordChange).toHaveBeenCalledWith(true);
  });
});
