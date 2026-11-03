import { render, screen, fireEvent } from "@testing-library/react";

import { ShiftsCard } from "../ShiftsCard";

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => <button data-testid="view-button" onClick={onPress}>{children}</button>,
}));

jest.mock("lucide-react", () => ({
  User: () => null,
}));

const SHIFT = {
  userName: "alice",
  shiftDate: "2024-01-15",
  startTime: "08:00:00",
  endTime: "16:00:00",
  initialAmount: 100,
  finalAmount: 150,
  difference: 20,
};

const formatCurrency = jest.fn((amount) => `$${amount}`);

describe("ShiftsCard", () => {
  beforeEach(() => formatCurrency.mockClear());

  it("shows the user name", () => {
    render(<ShiftsCard shift={SHIFT} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows a dash when the shift has not been closed", () => {
    render(<ShiftsCard shift={{ ...SHIFT, endTime: null, finalAmount: null, difference: null }} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls formatCurrency with the initial amount", () => {
    render(<ShiftsCard shift={SHIFT} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(formatCurrency).toHaveBeenCalledWith(100);
  });

  it("calls onClick when ViewButton is pressed", () => {
    const onClick = jest.fn();
    render(<ShiftsCard shift={SHIFT} formatCurrency={formatCurrency} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("view-button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
