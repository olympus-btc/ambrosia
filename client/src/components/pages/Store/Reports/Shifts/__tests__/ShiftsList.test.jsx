import { render, screen, fireEvent } from "@testing-library/react";

import { ShiftsList } from "../ShiftsList";

jest.mock("../ShiftsCard", () => ({
  ShiftsCard: ({ shift, onClick }) => (
    <div data-testid="shifts-card" onClick={onClick}>{shift.userName}</div>
  ),
}));

jest.mock("../ShiftDetailModal", () => ({
  ShiftDetailModal: ({ shift, onClose }) => (
    <div
      data-testid="shift-detail-modal"
      data-open={String(Boolean(shift))}
      onClick={onClose}
    />
  ),
}));

jest.mock("@/components/shared/DataTable", () => ({
  DataTable: ({ columns, items, getKey }) => (
    <table>
      <tbody>
        {items.map((item) => (
          <tr key={getKey(item)}>
            {columns.map((col) => (
              <td key={col.key}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => (
    <button data-testid="view-button" onClick={onPress}>{children}</button>
  ),
}));

jest.mock("lucide-react", () => ({
  Clock: () => null,
}));

const SHIFTS_FIXTURE = [
  {
    id: "shift-1",
    userName: "alice",
    shiftDate: "2024-01-15",
    startTime: "08:00:00",
    endTime: "16:00:00",
    initialAmount: 100,
    finalAmount: 150,
    difference: 20,
  },
  {
    id: "shift-2",
    userName: "bob",
    shiftDate: "2024-01-16",
    startTime: "08:00:00",
    endTime: null,
    initialAmount: 50,
    finalAmount: null,
    difference: null,
  },
];

const formatCurrency = (amount) => `$${amount}`;

describe("ShiftsList", () => {
  it("shows empty state when shifts is empty", () => {
    render(<ShiftsList shifts={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByText("shiftsReport.empty")).toBeInTheDocument();
  });

  it("renders a ShiftsCard per shift in mobile view", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getAllByTestId("shifts-card")).toHaveLength(2);
  });

  it("renders a ViewButton per shift in desktop view", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getAllByTestId("view-button")).toHaveLength(2);
  });

  it("modal starts closed", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("shift-detail-modal")).toHaveAttribute("data-open", "false");
  });

  it("opens the modal when a ViewButton is pressed", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getAllByTestId("view-button")[0]);
    expect(screen.getByTestId("shift-detail-modal")).toHaveAttribute("data-open", "true");
  });

  it("opens the modal when a card is clicked", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getAllByTestId("shifts-card")[1]);
    expect(screen.getByTestId("shift-detail-modal")).toHaveAttribute("data-open", "true");
  });

  it("closes the modal via onClose callback", () => {
    render(<ShiftsList shifts={SHIFTS_FIXTURE} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getAllByTestId("view-button")[0]);
    fireEvent.click(screen.getByTestId("shift-detail-modal"));
    expect(screen.getByTestId("shift-detail-modal")).toHaveAttribute("data-open", "false");
  });
});
