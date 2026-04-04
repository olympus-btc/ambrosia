import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { CurrencyCard } from "../CurrencyCard";

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

    it("renders the currency select", async () => {
      await act(async () => { renderCard(); });
      expect(screen.getByLabelText("cardCurrency.currencyLabel")).toBeInTheDocument();
    });

    it("renders all currency options", async () => {
      await act(async () => { renderCard(); });
      const options = screen.getAllByRole("option");
      const codes = options.map((o) => o.value);
      expect(codes).toContain("USD");
      expect(codes).toContain("EUR");
      expect(codes).toContain("MXN");
    });

    it("pre-selects the current currency", async () => {
      await act(async () => { renderCard({ selectedCurrency: "EUR" }); });
      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      expect(select.value).toBe("EUR");
    });
  });

  describe("Interactions", () => {
    it("calls onCurrencyChange when a currency is selected", async () => {
      const mockOnChange = jest.fn();
      await act(async () => { renderCard({ onCurrencyChange: mockOnChange }); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(select, { target: { value: "MXN" } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });
});
