import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

import * as useCurrencyHook from "@components/hooks/useCurrency";
import { I18nProvider } from "@i18n/I18nProvider";

import { Currency } from "../Currency";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Select = ({ label, selectedKeys, onChange, children }) => {
    const value = selectedKeys ? [...selectedKeys][0] ?? "" : "";
    return (
      <label>
        {label}
        <select aria-label={label} value={value} onChange={onChange}>
          {children}
        </select>
      </label>
    );
  };
  const SelectItem = ({ value, children }) => (
    <option value={value ?? ""}>{children}</option>
  );
  return { ...actual, Select, SelectItem };
});

const mockUpdateCurrency = jest.fn();

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

    it("renders currency options based on locale", async () => {
      await act(async () => { renderCurrency(); });
      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      expect(select).toBeInTheDocument();
      expect(select.options.length).toBeGreaterThan(0);
    });
  });

  describe("Currency Change", () => {
    it("calls updateCurrency when a valid currency is selected", async () => {
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(select, { target: { value: "EUR" } });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "EUR" });
      });
    });

    it("does not call updateCurrency when empty value is selected", async () => {
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(select, { target: { value: "" } });

      await waitFor(() => {
        expect(mockUpdateCurrency).not.toHaveBeenCalled();
      });
    });

    it("updates currency to MXN when selected", async () => {
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(select, { target: { value: "MXN" } });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "MXN" });
      });
    });
  });
});
