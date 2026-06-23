import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

import * as useCurrencyHook from "@components/hooks/useCurrency";
import { I18nProvider } from "@i18n/I18nProvider";

import { Currency } from "../Currency";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Autocomplete = ({
    children, label, onSelectionChange, selectedKey,
  }) => (
    <div data-testid="autocomplete-wrapper">
      <label htmlFor="currency-select">{label}</label>
      <select
        id="currency-select"
        aria-label={label}
        value={selectedKey}
        onChange={(event) => onSelectionChange(event.target.value)}
      >
        <option value="">Select currency</option>
        {children}
      </select>
    </div>
  );
  const AutocompleteItem = ({ children, textValue }) => {
    const code = textValue ? textValue.split(" ")[0] : children.toString().split(" ")[0];
    return (
      <option value={code}>
        {textValue || children}
      </option>
    );
  };
  return {
    ...actual,
    Autocomplete,
    AutocompleteItem,
    addToast: jest.fn(),
  };
});

const mockUpdateCurrency = jest.fn().mockResolvedValue({ status: "ok" });

const mockCurrency = {
  id: 1,
  acronym: "USD",
  symbol: "$",
  locale: "en-US",
  name: "United States Dollar",
};

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

  jest.spyOn(useCurrencyHook, "useCurrency").mockReturnValue({
    currency: mockCurrency,
    updateCurrency: mockUpdateCurrency,
    formatAmount: jest.fn(),
    refetch: jest.fn(),
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

function renderCurrency() {
  return render(
    <I18nProvider>
      <Currency />
    </I18nProvider>,
  );
}

describe("Currency", () => {
  describe("Rendering", () => {
    it("renders the currency card", async () => {
      await act(async () => { renderCurrency(); });
      expect(screen.getByText("cardCurrency.title")).toBeInTheDocument();
    });

    it("pre-selects the current currency from useCurrency hook", async () => {
      await act(async () => { renderCurrency(); });
      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      expect(select.value).toBe("USD");
    });
  });

  describe("Currency Change", () => {
    it("calls updateCurrency and shows toast when a valid currency is selected", async () => {
      const { addToast } = require("@heroui/react");
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      await act(async () => {
        fireEvent.change(select, { target: { value: "EUR" } });
      });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "EUR" });
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          color: "success",
        }));
      });
    });

    it("does not call updateCurrency when the same currency is selected", async () => {
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      await act(async () => {
        fireEvent.change(select, { target: { value: "USD" } });
      });

      expect(mockUpdateCurrency).not.toHaveBeenCalled();
    });

    it("does not call updateCurrency when empty value is selected", async () => {
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      await act(async () => {
        fireEvent.change(select, { target: { value: "" } });
      });

      expect(mockUpdateCurrency).not.toHaveBeenCalled();
    });
  });
});
