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
    expect(screen.getByText("status.paid")).toBeInTheDocument();
  });

  it("renders open status chip", () => {
    render(<StatusChip status="open" />);
    expect(screen.getByText("status.open")).toBeInTheDocument();
  });

  it("renders closed status chip", () => {
    render(<StatusChip status="closed" />);
    expect(screen.getByText("status.closed")).toBeInTheDocument();
  });
});
