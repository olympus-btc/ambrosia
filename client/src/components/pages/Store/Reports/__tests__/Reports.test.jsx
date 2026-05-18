import { render, screen } from "@testing-library/react";

import Reports from "../Reports";

jest.mock("../StoreReports", () => ({
  StoreReports: () => <div data-testid="store-reports" />,
}));

describe("Reports", () => {
  it("renders PageHeader with title and subtitle", () => {
    render(<Reports />);
    expect(screen.getByText("header.title")).toBeInTheDocument();
    expect(screen.getByText("header.subtitle")).toBeInTheDocument();
  });

  it("renders StoreReports", () => {
    render(<Reports />);
    expect(screen.getByTestId("store-reports")).toBeInTheDocument();
  });
});
