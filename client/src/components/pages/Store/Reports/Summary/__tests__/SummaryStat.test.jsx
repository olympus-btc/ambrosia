import { render, screen } from "@testing-library/react";

import { SummaryStat } from "../SummaryStat";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { ...actual, Card, CardBody };
});

const tone = {
  bg: "bg-white",
  border: "border-default-100",
  iconBg: "bg-green-100",
  text: "text-default-500",
  value: "text-default-900",
};

describe("SummaryStat", () => {
  it("renders the label and value", () => {
    render(<SummaryStat label="Total Revenue" value="$150.00" tone={tone} />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("applies tone.bg class to the card", () => {
    const { container } = render(
      <SummaryStat label="Revenue" value="$0" tone={tone} />,
    );
    expect(container.firstChild).toHaveClass("bg-white");
  });

  it("applies tone.value class to the value element", () => {
    render(<SummaryStat label="Revenue" value="$42" tone={tone} />);
    const valueEl = screen.getByText("$42");
    expect(valueEl).toHaveClass("text-default-900");
  });

  it("centers content and uses compact padding", () => {
    const { container } = render(<SummaryStat label="Items" value={7} tone={tone} />);
    const body = container.querySelector(".flex");
    expect(body).toHaveClass("items-center", "justify-center", "text-center");
  });
});
