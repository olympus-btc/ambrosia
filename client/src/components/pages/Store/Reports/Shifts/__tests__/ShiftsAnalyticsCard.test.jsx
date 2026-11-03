import { render, screen } from "@testing-library/react";

import { ShiftsAnalyticsCard } from "../ShiftsAnalyticsCard";

jest.mock("../../hooks/useShiftsChartData", () => ({
  useShiftsChartData: () => ({
    differenceByDay: [],
    paymentMethodSplit: [],
  }),
}));

jest.mock("../DifferenceOverTimeChart", () => ({
  DifferenceOverTimeChart: ({ differenceByDay }) => (
    <div data-testid="difference-over-time-chart" data-length={differenceByDay.length} />
  ),
}));

jest.mock("../../Charts", () => ({
  PaymentMethodPieChart: ({ paymentMethods }) => (
    <div data-testid="payment-method-pie-chart" data-length={paymentMethods.length} />
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

const formatCurrency = (cents) => `$${cents}`;

describe("ShiftsAnalyticsCard", () => {
  it("renders DifferenceOverTimeChart", () => {
    render(<ShiftsAnalyticsCard shifts={[]} byPaymentMethod={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("difference-over-time-chart")).toBeInTheDocument();
  });

  it("renders PaymentMethodPieChart", () => {
    render(<ShiftsAnalyticsCard shifts={[]} byPaymentMethod={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("payment-method-pie-chart")).toBeInTheDocument();
  });
});
