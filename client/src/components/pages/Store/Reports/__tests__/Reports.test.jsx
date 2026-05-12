import { render, screen } from "@testing-library/react";

import Reports from "../Reports";

jest.mock("../StoreReports", () => ({
  StoreReports: () => <div data-testid="store-reports" />,
}));

describe("Reports", () => {
  it("renders StoreReports", () => {
    render(<Reports />);
    expect(screen.getByTestId("store-reports")).toBeInTheDocument();
  });
});
