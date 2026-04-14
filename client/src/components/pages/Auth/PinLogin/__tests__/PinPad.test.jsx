import { act, render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { PinPad } from "../PinPad";

const mockHandlers = {
  onNumberClick: jest.fn(),
  onDelete: jest.fn(),
  onClear: jest.fn(),
  onLogin: jest.fn(),
};

const renderPinPad = (props = {}) => render(
  <I18nProvider>
    <PinPad
      pin=""
      error=""
      isLoading={false}
      lockedUntil={null}
      onLockoutExpired={jest.fn()}
      {...mockHandlers}
      {...props}
    />
  </I18nProvider>,
);

beforeEach(() => jest.clearAllMocks());

describe("PinPad", () => {
  it("renders number buttons 0-9", () => {
    renderPinPad();
    for (const n of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
  });

  it("renders erase, clear and login buttons", () => {
    renderPinPad();
    expect(screen.getByRole("button", { name: /eraseButton/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clearButton/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /loginButton/i })).toBeInTheDocument();
  });

  it("calls onNumberClick when a number is pressed", () => {
    renderPinPad();
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(mockHandlers.onNumberClick).toHaveBeenCalledWith("5");
  });

  it("calls onDelete when erase is pressed", () => {
    renderPinPad({ pin: "12" });
    fireEvent.click(screen.getByRole("button", { name: /eraseButton/i }));
    expect(mockHandlers.onDelete).toHaveBeenCalled();
  });

  it("calls onClear when clear is pressed", () => {
    renderPinPad({ pin: "12" });
    fireEvent.click(screen.getByRole("button", { name: /clearButton/i }));
    expect(mockHandlers.onClear).toHaveBeenCalled();
  });

  it("calls onLogin when login is pressed", () => {
    renderPinPad({ pin: "1234" });
    fireEvent.click(screen.getByRole("button", { name: /loginButton/i }));
    expect(mockHandlers.onLogin).toHaveBeenCalled();
  });

  it("login button is disabled when pin is empty", () => {
    renderPinPad({ pin: "" });
    expect(screen.getByRole("button", { name: /loginButton/i })).toBeDisabled();
  });

  it("erase and clear buttons are disabled when pin is empty", () => {
    renderPinPad({ pin: "" });
    expect(screen.getByRole("button", { name: /eraseButton/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clearButton/i })).toBeDisabled();
  });

  it("shows error message when error prop is provided", () => {
    renderPinPad({ error: "Invalid PIN" });
    expect(screen.getByText("Invalid PIN")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading is true", () => {
    renderPinPad({ pin: "1234", isLoading: true });
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByText("loginButton")).not.toBeInTheDocument();
  });

  it("renders PIN input with placeholder", () => {
    renderPinPad();
    expect(screen.getByPlaceholderText("----")).toBeInTheDocument();
  });

  it("does not show lockout message when lockedUntil is in the past", async () => {
    renderPinPad({ lockedUntil: Date.now() - 1000 });
    await act(async () => {});
    expect(screen.queryByText(/lockout\.message/)).not.toBeInTheDocument();
  });

  it("shows lockout message and disables all buttons when lockedUntil is in the future", async () => {
    renderPinPad({ lockedUntil: Date.now() + 180000 });
    await act(async () => {});
    expect(screen.getByText(/lockout\.message/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eraseButton/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clearButton/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /loginButton/i })).toBeDisabled();
  });

  it("does not call handlers on keydown when locked", async () => {
    renderPinPad({ lockedUntil: Date.now() + 180000 });
    await act(async () => {});
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockHandlers.onNumberClick).not.toHaveBeenCalled();
    expect(mockHandlers.onLogin).not.toHaveBeenCalled();
  });
});
