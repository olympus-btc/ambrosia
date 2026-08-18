import { render, screen } from "@testing-library/react";

import { StatusChip } from "../StatusChip";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Chip = ({ children }) => <span>{children}</span>;
  return { ...actual, Chip };
});

describe("StatusChip", () => {
  it("renders paid status chip", () => {
    render(<StatusChip status="paid" />);
    expect(screen.getByText("paid")).toBeInTheDocument();
  });

  it("renders open status chip", () => {
    render(<StatusChip status="open" />);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders closed status chip", () => {
    render(<StatusChip status="closed" />);
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("renders refunded status chip", () => {
    render(<StatusChip status="refunded" />);
    expect(screen.getByText("refunded")).toBeInTheDocument();
  });

  it("renders refund status chip", () => {
    render(<StatusChip status="refund" />);
    expect(screen.getByText("refund")).toBeInTheDocument();
  });
});
