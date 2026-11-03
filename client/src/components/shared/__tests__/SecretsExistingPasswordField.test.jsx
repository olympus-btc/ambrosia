import { render, screen, fireEvent } from "@testing-library/react";

import { SecretsExistingPasswordField } from "../SecretsExistingPasswordField";

jest.mock("@heroui/react", () => ({
  Input: ({ label, type, value: passwordValue, onValueChange: onPasswordValueChange, endContent, isInvalid, errorMessage }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input
        id={label}
        type={type}
        value={passwordValue}
        onChange={(event) => onPasswordValueChange(event.target.value)}
      />
      {isInvalid && errorMessage && <span>{errorMessage}</span>}
      {endContent}
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  Eye: () => <svg data-testid="icon-eye" />,
  EyeOff: () => <svg data-testid="icon-eye-off" />,
}));

function renderField(props = {}) {
  return render(
    <SecretsExistingPasswordField unlockPassword="" onUnlockPasswordChange={jest.fn()} passwordError="" {...props} />,
  );
}

describe("SecretsExistingPasswordField", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the password label and current value", () => {
      renderField({ unlockPassword: "correct-unlock-password" });

      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel").value).toBe("correct-unlock-password");
    });

    it("shows no error message by default", () => {
      renderField();

      expect(screen.queryByTestId("icon-eye")).toBeInTheDocument();
      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).not.toHaveAttribute("aria-invalid", "true");
    });

    it("shows the error message when one is provided", () => {
      renderField({ passwordError: "Invalid credentials" });

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onUnlockPasswordChange with the entered value", () => {
      const onUnlockPasswordChange = jest.fn();
      renderField({ onUnlockPasswordChange });

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "new-unlock-password" },
      });

      expect(onUnlockPasswordChange).toHaveBeenCalledWith("new-unlock-password");
    });

    it("toggles the password field between hidden and visible", () => {
      renderField();

      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "password");

      fireEvent.click(screen.getByTestId("icon-eye"));

      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "text");
    });
  });
});
