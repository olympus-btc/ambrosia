import { render, screen, fireEvent, act } from "@testing-library/react";

import { UserAccountStep } from "../AddUserAccount";

describe("Step 2 User Account", () => {
  const mockChange = jest.fn();

  const defaultData = {
    userName: "",
    userPassword: "",
    userPasswordConfirmation: "",
  };

  beforeEach(() => {
    mockChange.mockClear();
  });

  it("renders username, password, and confirmation fields", async () => {
    await act(async () => {
      render(<UserAccountStep data={defaultData} onChange={mockChange} />);
    });

    expect(screen.getByPlaceholderText("step2.fields.userNamePlaceholder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("step2.fields.passwordPlaceholder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("step2.fields.confirmPasswordPlaceholder")).toBeInTheDocument();
  });

  it("calls onChange when username is typed", async () => {
    await act(async () => {
      render(<UserAccountStep data={defaultData} onChange={mockChange} />);
    });

    const userInput = screen.getByPlaceholderText("step2.fields.userNamePlaceholder");

    await act(async () => {
      fireEvent.change(userInput, { target: { value: "Ivan" } });
    });

    expect(mockChange).toHaveBeenCalledWith({
      userName: "Ivan",
      userPassword: "",
      userPasswordConfirmation: "",
    });
  });

  it("calls onChange and updates password strength", async () => {
    const { rerender } = render(
      <UserAccountStep data={defaultData} onChange={mockChange} />,
    );

    const passwordInput = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "abc123!!" } });
    });

    rerender(
      <UserAccountStep
        data={{ ...defaultData, userPassword: "abc123!!" }}
        onChange={mockChange}
      />,
    );

    expect(mockChange).toHaveBeenCalledWith({
      userName: "",
      userPassword: "abc123!!",
      userPasswordConfirmation: "",
    });

    expect(screen.getByText(/step2.strength.title:/)).toBeInTheDocument();
    expect(screen.getByText(/step2.strength.weak|step2.strength.regular|step2.strength.good|step2.strength.strong/)).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    await act(async () => {
      render(
        <UserAccountStep
          data={{ ...defaultData, userPassword: "password123", userPasswordConfirmation: "different" }}
          onChange={mockChange}
        />,
      );
    });

    expect(screen.getByText("step2.passwordsDoNotMatch")).toBeInTheDocument();
  });

  it("toggles pin visibility when clicking the eye icon", async () => {
    await act(async () => {
      render(<UserAccountStep data={{ userName: "", userPassword: "abc123!!" }} onChange={mockChange} />);
    });

    const toggleButtons = screen.getAllByRole("button");
    const input = screen.getByPlaceholderText("step2.fields.userPinPlaceholder");

    expect(input).toHaveAttribute("type", "password");

    await act(async () => {
      fireEvent.click(toggleButtons[0]);
    });
    expect(input).toHaveAttribute("type", "text");

    await act(async () => {
      fireEvent.click(toggleButtons[0]);
    });
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles password visibility when clicking the eye icon", async () => {
    render(<UserAccountStep data={{ userName: "", userPassword: "abc123!!" }} onChange={mockChange} />);

    const toggleButtons = screen.getAllByRole("button");
    const input = screen.getByPlaceholderText("step2.fields.passwordPlaceholder");

    expect(input).toHaveAttribute("type", "password");

    await act(async () => {
      fireEvent.click(toggleButtons[1]);
    });
    expect(input).toHaveAttribute("type", "text");

    await act(async () => {
      fireEvent.click(toggleButtons[1]);
    });

    expect(input).toHaveAttribute("type", "password");
  });
});
