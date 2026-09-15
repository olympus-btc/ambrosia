import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import * as secretsService from "@/services/secretsService";

import { SecretsGatedRevealButton } from "../SecretsGatedRevealButton";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, startContent, color, ...props }) => (
    <button type="button" onClick={onPress} data-color={color} {...props}>
      {startContent}
      {children}
    </button>
  ),
}));

jest.mock("@/services/secretsService", () => ({
  ...jest.requireActual("@/services/secretsService"),
  getSecretsLockStatus: jest.fn(),
}));

jest.mock("../SecretsUnlockModal", () => ({
  SecretsUnlockModal: ({ onClose }) => (
    <div>
      <span>secrets-unlock-modal</span>
      <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

beforeEach(() => {
  secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: false, locked: false });
});

function renderButton(props = {}) {
  return render(<SecretsGatedRevealButton onReveal={jest.fn()} revealLabel="reveal.label" {...props} />);
}

describe("SecretsGatedRevealButton", () => {
  describe("when secrets are not locked", () => {
    it("shows the reveal label", async () => {
      renderButton();
      await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

      expect(screen.getByText("reveal.label")).toBeInTheDocument();
    });

    it("calls onReveal when pressed", async () => {
      const onReveal = jest.fn();
      renderButton({ onReveal });
      await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

      fireEvent.click(screen.getByText("reveal.label"));

      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });

  describe("when secrets are locked", () => {
    it("shows the unlock label in a danger-colored button instead of the reveal label", async () => {
      secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      renderButton();

      await waitFor(() => expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument());

      expect(screen.getByText("secretsEncryptionCard.unlockButton").closest("button")).toHaveAttribute("data-color", "danger");
      expect(screen.queryByText("reveal.label")).not.toBeInTheDocument();
    });

    it("opens the unlock modal instead of calling onReveal when pressed", async () => {
      secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      const onReveal = jest.fn();
      renderButton({ onReveal });
      await waitFor(() => expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument());

      fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));

      expect(onReveal).not.toHaveBeenCalled();
      expect(screen.getByText("secrets-unlock-modal")).toBeInTheDocument();
    });
  });
});
