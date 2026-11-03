import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

import { usePermission } from "@/hooks/usePermission";
import { I18nProvider } from "@i18n/I18nProvider";

import { CurrencyCard } from "../CurrencyCard";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Autocomplete = ({
    children, label, onSelectionChange, selectedKey, defaultFilter, isDisabled,
  }) => {
    const [inputValue, setInputValue] = require("react").useState("");
    const filteredChildren = require("react").Children.toArray(children).filter((child) => (
      !inputValue || defaultFilter(child.props.textValue, inputValue)
    ));

    return (
      <div data-testid="autocomplete-wrapper">
        <label htmlFor="currency-search">{label}</label>
        <input
          id="currency-search"
          aria-label={label}
          value={inputValue}
          disabled={isDisabled}
          onChange={(event) => setInputValue(event.target.value)}
        />
        <select
          aria-label={`${label} options`}
          value={selectedKey ?? ""}
          disabled={isDisabled}
          onChange={(event) => onSelectionChange(event.target.value)}
        >
          <option value="">Select currency</option>
          {filteredChildren}
        </select>
      </div>
    );
  };
  const AutocompleteItem = ({ children, textValue }) => {
    const code = textValue ? textValue.split(" ")[0] : children.toString().split(" ")[0];
    return (
      <option value={code}>
        {textValue || children}
      </option>
    );
  };
  return { ...actual, Autocomplete, AutocompleteItem };
});

const mockCurrencies = [
  { code: "USD", name: "United States Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Mexican Peso" },
];

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("aria-label")) return;
    originalWarn.call(console, ...args);
  };
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (
      message.includes("onAnimationComplete") ||
      message.includes("Unknown event handler property")
    ) return;
    originalError.call(console, ...args);
  };
  jest.clearAllMocks();
  usePermission.mockReturnValue(true);
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

function renderCard(props = {}) {
  return render(
    <I18nProvider>
      <CurrencyCard
        selectedCurrency="USD"
        currencies={mockCurrencies}
        onCurrencyChange={jest.fn()}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("CurrencyCard", () => {
  describe("Rendering", () => {
    it("renders the card title", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByText("cardCurrency.title")).toBeInTheDocument();
    });

    it("renders the currency autocomplete", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByLabelText("cardCurrency.currencyLabel")).toBeInTheDocument();
    });

    it("renders all currency options", async () => {
      await act(async () => { renderCard(); });
      const options = screen.getAllByRole("option");
      const codes = options.map((o) => o.value).filter((val) => val !== "");
      expect(codes).toContain("USD");
      expect(codes).toContain("EUR");
      expect(codes).toContain("MXN");
    });

    it("pre-selects the current currency", async () => {
      await act(async () => { renderCard({ selectedCurrency: "EUR" }); });
      const select = screen.getByLabelText("cardCurrency.currencyLabel options");
      expect(select.value).toBe("EUR");
    });
  });

  describe("Permission gating", () => {
    it("keeps the currency visible but disabled for a role without settings_update", async () => {
      usePermission.mockReturnValue(false);
      await act(async () => { renderCard({ selectedCurrency: "EUR" }); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel options");
      expect(select.value).toBe("EUR");
      expect(select).toBeDisabled();
    });

    it("enables the currency selector for a role with settings_update", async () => {
      usePermission.mockReturnValue(true);
      await act(async () => { renderCard(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel options");
      expect(select).not.toBeDisabled();
    });
  });

  describe("Interactions", () => {
    it("calls onCurrencyChange when a currency is selected", async () => {
      const mockOnChange = jest.fn();
      await act(async () => { renderCard({ onCurrencyChange: mockOnChange }); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel options");
      fireEvent.change(select, { target: { value: "MXN" } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("MXN");
      });
    });

    it("filters currencies by currency name", async () => {
      await act(async () => { renderCard(); });

      const searchInput = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(searchInput, { target: { value: "mex" } });

      expect(screen.getByRole("option", { name: "MXN - Mexican Peso" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "USD - United States Dollar" })).not.toBeInTheDocument();
    });
  });

  describe("Composition", () => {
    it("renders the content it receives below the currency selector", async () => {
      await act(async () => { renderCard({ extraCurrencySettings: <p>Alice price step</p> }); });
      expect(screen.getByText("Alice price step")).toBeInTheDocument();
    });
  });
});
