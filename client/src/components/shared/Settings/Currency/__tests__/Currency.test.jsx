import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as configurationsProvider from "@/providers/configurations/configurationsProvider";
import * as useCurrencyHook from "@components/hooks/useCurrency";
import { I18nProvider } from "@i18n/I18nProvider";

import { Currency } from "../Currency";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

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
const mockUpdateConfig = jest.fn().mockResolvedValue({ status: "ok" });

const mockBusinessConfig = { priceStep: 0.01 };

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
      message.includes("Unknown event handler property") ||
      message.includes("Failed to update currency") ||
      message.includes("Failed to update price step")
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

  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: mockBusinessConfig,
    updateConfig: mockUpdateConfig,
    isLoading: false,
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

    it("shows an error toast when currency update fails", async () => {
      const { addToast } = require("@heroui/react");
      mockUpdateCurrency.mockRejectedValueOnce(new Error("request failed"));
      await act(async () => { renderCurrency(); });

      const select = screen.getByLabelText("cardCurrency.currencyLabel");
      await act(async () => {
        fireEvent.change(select, { target: { value: "EUR" } });
      });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "EUR" });
        expect(addToast).toHaveBeenCalledWith({
          title: "cardCurrency.errorTitle",
          description: "cardCurrency.errorDescription",
          color: "danger",
        });
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

  describe("Price Step", () => {
    it("calls updateConfig and shows toast when the price step is saved", async () => {
      const user = userEvent.setup();
      const { addToast } = require("@heroui/react");
      await act(async () => { renderCurrency(); });

      const priceStepInput = screen.getByLabelText("cardCurrency.priceStepLabel");
      await user.clear(priceStepInput);
      await user.type(priceStepInput, "0.5");
      await user.tab();
      await user.click(screen.getByText("cardCurrency.priceStepSaveButton"));

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({ ...mockBusinessConfig, priceStep: 0.5 });
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          color: "success",
        }));
      });
    });

    it("shows an error toast when the price step update fails", async () => {
      const user = userEvent.setup();
      const { addToast } = require("@heroui/react");
      mockUpdateConfig.mockRejectedValueOnce(new Error("request failed"));
      await act(async () => { renderCurrency(); });

      const priceStepInput = screen.getByLabelText("cardCurrency.priceStepLabel");
      await user.clear(priceStepInput);
      await user.type(priceStepInput, "0.5");
      await user.tab();
      await user.click(screen.getByText("cardCurrency.priceStepSaveButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith({
          title: "cardCurrency.priceStepErrorTitle",
          description: "cardCurrency.priceStepErrorDescription",
          color: "danger",
        });
      });
    });
  });
});
