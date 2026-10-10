import { render, screen, fireEvent, act } from "@testing-library/react";

import * as useSystemRestartHook from "@/hooks/useSystemRestart";

import { SystemCard } from "../SystemCard";

jest.mock("@/hooks/useSystemRestart");

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, isLoading, ...props }) => (
    <button type="button" disabled={isLoading} onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("../RestartConfirmModal", () => ({
  RestartConfirmModal: ({ isOpen, title, description, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="restart-confirm-modal">
        <span>{title}</span>
        <span>{description}</span>
        <button type="button" onClick={onConfirm}>confirm</button>
        <button type="button" onClick={onCancel}>cancel</button>
      </div>
    ) : null
  ),
}));

function mockUseSystemRestart(overrides = {}) {
  const defaults = {
    serverRestartSupported: false,
    phoenixdRestartSupported: false,
    restartingTarget: null,
    loadRestartCapabilities: jest.fn(),
    restartServer: jest.fn().mockResolvedValue(true),
    restartPhoenixd: jest.fn().mockResolvedValue(true),
  };
  const restartState = { ...defaults, ...overrides };
  jest.spyOn(useSystemRestartHook, "useSystemRestart").mockReturnValue(restartState);
  return restartState;
}

describe("SystemCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the title and description", () => {
      mockUseSystemRestart();
      render(<SystemCard />);

      expect(screen.getByText("cardSystem.title")).toBeInTheDocument();
      expect(screen.getByText("cardSystem.description")).toBeInTheDocument();
    });

    it("shows the unsupported notice when neither target can be restarted", () => {
      mockUseSystemRestart();
      render(<SystemCard />);

      expect(screen.getByText("cardSystem.unsupportedNotice")).toBeInTheDocument();
      expect(screen.queryByText("cardSystem.restartServerButton")).not.toBeInTheDocument();
      expect(screen.queryByText("cardSystem.restartPhoenixdButton")).not.toBeInTheDocument();
    });

    it("shows only the server button when only server restart is supported", () => {
      mockUseSystemRestart({ serverRestartSupported: true });
      render(<SystemCard />);

      expect(screen.getByText("cardSystem.restartServerButton")).toBeInTheDocument();
      expect(screen.queryByText("cardSystem.restartPhoenixdButton")).not.toBeInTheDocument();
    });

    it("shows both buttons when both targets are supported", () => {
      mockUseSystemRestart({ serverRestartSupported: true, phoenixdRestartSupported: true });
      render(<SystemCard />);

      expect(screen.getByText("cardSystem.restartServerButton")).toBeInTheDocument();
      expect(screen.getByText("cardSystem.restartPhoenixdButton")).toBeInTheDocument();
    });

    it("loads restart capabilities on mount", () => {
      const restartState = mockUseSystemRestart();
      render(<SystemCard />);

      expect(restartState.loadRestartCapabilities).toHaveBeenCalledTimes(1);
    });
  });

  describe("Restarting the server", () => {
    it("opens the confirmation modal when the restart server button is pressed", () => {
      mockUseSystemRestart({ serverRestartSupported: true });
      render(<SystemCard />);

      fireEvent.click(screen.getByText("cardSystem.restartServerButton"));

      expect(screen.getByTestId("restart-confirm-modal")).toBeInTheDocument();
      expect(screen.getByText("cardSystem.confirmServerTitle")).toBeInTheDocument();
    });

    it("calls restartServer and shows a success toast on confirm", async () => {
      const restartState = mockUseSystemRestart({ serverRestartSupported: true });
      const { addToast } = require("@heroui/react");
      render(<SystemCard />);

      fireEvent.click(screen.getByText("cardSystem.restartServerButton"));
      await act(async () => {
        fireEvent.click(screen.getByText("confirm"));
      });

      expect(restartState.restartServer).toHaveBeenCalledTimes(1);
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "cardSystem.restartServerSuccess" }),
      );
      expect(screen.queryByTestId("restart-confirm-modal")).not.toBeInTheDocument();
    });

    it("shows a danger toast when the restart fails", async () => {
      const restartState = mockUseSystemRestart({
        serverRestartSupported: true,
        restartServer: jest.fn().mockResolvedValue(false),
      });
      const { addToast } = require("@heroui/react");
      render(<SystemCard />);

      fireEvent.click(screen.getByText("cardSystem.restartServerButton"));
      await act(async () => {
        fireEvent.click(screen.getByText("confirm"));
      });

      expect(restartState.restartServer).toHaveBeenCalledTimes(1);
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "cardSystem.restartServerError" }),
      );
    });

    it("closes the modal without restarting when cancelled", () => {
      const restartState = mockUseSystemRestart({ serverRestartSupported: true });
      render(<SystemCard />);

      fireEvent.click(screen.getByText("cardSystem.restartServerButton"));
      fireEvent.click(screen.getByText("cancel"));

      expect(restartState.restartServer).not.toHaveBeenCalled();
      expect(screen.queryByTestId("restart-confirm-modal")).not.toBeInTheDocument();
    });
  });

  describe("Restarting phoenixd", () => {
    it("calls restartPhoenixd on confirm", async () => {
      const restartState = mockUseSystemRestart({ phoenixdRestartSupported: true });
      render(<SystemCard />);

      fireEvent.click(screen.getByText("cardSystem.restartPhoenixdButton"));
      await act(async () => {
        fireEvent.click(screen.getByText("confirm"));
      });

      expect(restartState.restartPhoenixd).toHaveBeenCalledTimes(1);
    });
  });
});
