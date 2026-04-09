import { render, screen } from "@testing-library/react";

import { EmptyOrdersState } from "../EmptyOrdersState";

describe("EmptyOrdersState", () => {
  it("renders in-progress empty state when no search term", () => {
    render(<EmptyOrdersState filter="in-progress" searchTerm="" />);

    expect(screen.getByText("empty.titleInProgress")).toBeInTheDocument();
    expect(screen.getByText("empty.subtitleInProgress")).toBeInTheDocument();
  });

  it("renders search empty state when search term exists", () => {
    render(<EmptyOrdersState filter="paid" searchTerm="ana" />);

    expect(screen.getByText("empty.titlePaid")).toBeInTheDocument();
    expect(screen.getByText("empty.subtitleSearch")).toBeInTheDocument();
  });
});
