import { render, screen } from "@testing-library/react";

import { StatusChip } from "../StatusChip";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Chip = ({ children }) => <span>{children}</span>;
  return { ...actual, Chip };
});

describe("StatusChip", () => {
  it("renders paid status chip", () => {
    render(<StatusChip />);
    expect(screen.getByText("status.paid")).toBeInTheDocument();
  });
});
