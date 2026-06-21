import { render, screen } from "@testing-library/react";

import { ReportSkeleton } from "../ReportSkeleton";

jest.mock("@heroui/react", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Spinner: ({ size, color }) => <div data-testid="spinner" data-size={size} data-color={color} />,
}));

describe("ReportSkeleton", () => {
  it("renders the i18n loading message", () => {
    render(<ReportSkeleton />);
    expect(screen.getByText("statuses.loading")).toBeInTheDocument();
  });

  it("renders the spinner", () => {
    render(<ReportSkeleton />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });
});
