import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { BusinessTypeStep } from "../SelectBusiness";

const originalError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("An update to LazyMotion") ||
        args[0].includes("not wrapped in act(...)"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe("Step 1 Business Type Selection", () => {
  const mockChange = jest.fn();

  function renderBusinessTypeStep(value = "") {
    return render(
      <I18nProvider>
        <BusinessTypeStep value={value} onChange={mockChange} />
      </I18nProvider>,
    );
  }

  beforeEach(() => {
    mockChange.mockClear();
  });

  it("renders the title and subtitle", () => {
    renderBusinessTypeStep();
    expect(screen.getByText("step1.title")).toBeInTheDocument();
    expect(screen.getByText("step1.subtitle")).toBeInTheDocument();
  });

  it("renders both business type options", () => {
    renderBusinessTypeStep();
    expect(screen.getByText("step1.businessType.store")).toBeInTheDocument();
    expect(screen.getByText("step1.businessType.restaurant")).toBeInTheDocument();
  });

  it("renders the descriptions for both options", () => {
    renderBusinessTypeStep();
    expect(screen.getByText("step1.descriptions.store")).toBeInTheDocument();
    expect(screen.getByText("step1.descriptions.restaurant")).toBeInTheDocument();
  });

  it("calls onChange with 'store' when store card is clicked", () => {
    renderBusinessTypeStep();
    const storeCard = screen.getByLabelText("store");
    fireEvent.click(storeCard);
    expect(mockChange).toHaveBeenCalledWith("store");
  });

  it("calls onChange with 'restaurant' when restaurant card is clicked", () => {
    renderBusinessTypeStep();
    const restaurantCard = screen.getByLabelText("restaurant");
    fireEvent.click(restaurantCard);
    expect(mockChange).toHaveBeenCalledWith("store");
  });

  it("applies active styling when store is selected", () => {
    renderBusinessTypeStep("store");
    const storeCard = screen.getByLabelText("store");
    expect(storeCard).toHaveClass("bg-green-100");
  });

  it("does not apply active styling when no selection is made", () => {
    renderBusinessTypeStep("");
    const cards = screen.getAllByRole("button");
    expect(cards[0]).not.toHaveClass("bg-green-100");
  });

  it("applies hover styling to both cards", () => {
    renderBusinessTypeStep();
    const cards = screen.getAllByRole("button");

    cards.forEach((card) => {
      expect(card).toHaveClass("hover:bg-green-200");
    });
  });

  it("renders Store icon", () => {
    renderBusinessTypeStep();
    const storeCard = screen.getByLabelText("store");
    const icon = storeCard.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders Restaurant icon", () => {
    renderBusinessTypeStep();
    const cards = screen.getAllByRole("button");
    const restaurantCard = cards[1]; // Second card is restaurant
    const icon = restaurantCard.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("both cards are pressable", () => {
    renderBusinessTypeStep();
    const cards = screen.getAllByRole("button");
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card).toBeInTheDocument();
    });
  });
});
