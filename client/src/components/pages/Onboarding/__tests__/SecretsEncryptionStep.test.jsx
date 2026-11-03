import { render, screen, fireEvent } from "@testing-library/react";

import { SecretsEncryptionStep } from "../SecretsEncryptionStep";

jest.mock("@heroui/react", () => ({
  Checkbox: ({ children, isSelected, onValueChange }) => (
    <label>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(event) => onValueChange(event.target.checked)}
      />
      {children}
    </label>
  ),
}));

function renderStep(secretsEncryptionData = {}, onChange = jest.fn()) {
  const defaultSecretsEncryptionData = { activateSecretsEncryption: false };
  return {
    onChange,
    ...render(
      <SecretsEncryptionStep
        secretsEncryptionData={{ ...defaultSecretsEncryptionData, ...secretsEncryptionData }}
        onChange={onChange}
      />,
    ),
  };
}

describe("SecretsEncryptionStep", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders unchecked and without the wallet password warning by default", () => {
    renderStep();

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByText("stepSecretsEncryption.walletPasswordWarning")).not.toBeInTheDocument();
  });

  it("shows the wallet password warning and later-hint when already checked", () => {
    renderStep({ activateSecretsEncryption: true });

    expect(screen.getByText("stepSecretsEncryption.walletPasswordWarning")).toBeInTheDocument();
    expect(screen.getByText("stepSecretsEncryption.laterHint")).toBeInTheDocument();
  });

  it("checking the checkbox calls onChange with activateSecretsEncryption true", () => {
    const { onChange } = renderStep({ activateSecretsEncryption: false });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith({ activateSecretsEncryption: true });
  });

  it("unchecking the checkbox calls onChange with activateSecretsEncryption false", () => {
    const { onChange } = renderStep({ activateSecretsEncryption: true });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith({ activateSecretsEncryption: false });
  });
});
