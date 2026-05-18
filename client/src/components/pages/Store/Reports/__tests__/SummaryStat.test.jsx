import { render, screen } from "@testing-library/react";

import { SummaryStat } from "../Summary/SummaryStat";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { ...actual, Card, CardBody };
});

const tone = {
  bg: "bg-green-50",
  border: "border-green-200",
  iconBg: "bg-green-100",
  text: "text-green-700",
  value: "text-green-900",
};

describe("SummaryStat", () => {
  it("renders the label and value", () => {
    render(<SummaryStat icon={null} label="Total Revenue" value="$150.00" tone={tone} />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("applies tone.bg class to the card", () => {
    const { container } = render(
      <SummaryStat icon={null} label="Revenue" value="$0" tone={tone} />,
    );
    expect(container.firstChild).toHaveClass("bg-green-50");
  });

  it("applies tone.value class to the value element", () => {
    render(<SummaryStat icon={null} label="Revenue" value="$42" tone={tone} />);
    const valueEl = screen.getByText("$42");
    expect(valueEl).toHaveClass("text-green-900");
  });

  it("renders the icon when provided", () => {
    render(
      <SummaryStat
        icon={<span data-testid="test-icon" />}
        label="Items"
        value={7}
        tone={tone}
      />,
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});
