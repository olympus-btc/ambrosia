import { render, screen } from "@testing-library/react";

import { CartTotals } from "../CartTotals";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

describe("CartTotals", () => {
  it("renders the subtotal", () => {
    render(<CartTotals subtotal={1000} discountAmount={100} total={900} />);
    expect(screen.getByText("fmt-1000")).toBeInTheDocument();
  });

  it("renders the discount amount", () => {
    render(<CartTotals subtotal={1000} discountAmount={100} total={900} />);
    expect(screen.getByText("fmt-100")).toBeInTheDocument();
  });

  it("renders the total", () => {
    render(<CartTotals subtotal={1000} discountAmount={100} total={900} />);
    expect(screen.getByText("fmt-900")).toBeInTheDocument();
  });
});
