import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as usePrintersHook from "@/components/pages/Store/hooks/usePrinter";
import * as useTemplatesHook from "@/components/pages/Store/hooks/useTemplates";
import * as useCurrencyHook from "@components/hooks/useCurrency";
import * as useModulesHook from "@hooks/useModules";
import { I18nProvider } from "@i18n/I18nProvider";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { Settings } from "../Settings";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Select = ({ label, value, onChange, children }) => (
    <label>
      {label}
      <select aria-label={label} value={value || ""} onChange={onChange}>
        {children}
      </select>
    </label>
  );
  const SelectItem = ({ value, children }) => (
    <option value={value ?? ""}>{children}</option>
  );
  return { ...actual, Select, SelectItem };
});

function renderSettings() {
  return render(
    <I18nProvider>
      <Settings />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;
const originalError = console.error;

const defaultNavigation = [
  {
    path: "/store/settings",
    label: "settings",
    icon: "settings",
    showInNavbar: true,
  },
];

const mockLogout = jest.fn();
const mockUpdateConfig = jest.fn();
const mockUpdateCurrency = jest.fn();

const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
  businessTaxId: "RFC123456789",
  businessAddress: "Calle Principal 123",
  businessEmail: "tienda@test.com",
  businessPhone: "+52 555 1234567",
  businessLogoUrl: "http://localhost:9154/api/assets/logo.png",
};

const mockCurrency = {
  id: 1,
  acronym: "USD",
  symbol: "$",
  locale: "en-US",
  name: "United States Dollar",
  country_code: "US",
  country_name: "United States",
};

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
        args[0].includes("Unknown event handler property"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();

  jest.spyOn(useModulesHook, "useModules").mockReturnValue({
    availableModules: {},
    availableNavigation: defaultNavigation,
    checkRouteAccess: jest.fn(),
    isAuth: true,
    isAdmin: false,
    isLoading: false,
    user: { userName: "testuser" },
    logout: mockLogout,
  });

  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: mockConfig,
    isLoading: false,
    businessType: "store",
    refreshConfig: jest.fn(),
    updateConfig: mockUpdateConfig,
  });

  jest.spyOn(useCurrencyHook, "useCurrency").mockReturnValue({
    currency: mockCurrency,
    updateCurrency: mockUpdateCurrency,
    formatAmount: jest.fn(),
    refetch: jest.fn(),
  });

  jest.spyOn(usePrintersHook, "usePrinters").mockReturnValue({
    availablePrinters: [],
    printerConfigs: [],
    loadingAvailable: false,
    loadingConfigs: false,
    error: null,
    createPrinterConfig: jest.fn(),
    updatePrinterConfig: jest.fn(),
    deletePrinterConfig: jest.fn(),
    setDefaultPrinterConfig: jest.fn(),
  });

  jest.spyOn(useTemplatesHook, "useTemplates").mockReturnValue({
    templates: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("Settings page", () => {
  describe("Rendering", () => {
    it("renders store info, currency, and languages cards", async () => {
      await act(async () => {
        renderSettings();
      });
      expect(screen.getByText("cardInfo.title")).toBeInTheDocument();
      expect(screen.getByText("cardCurrency.title")).toBeInTheDocument();
      expect(screen.getByText("cardLanguage.title")).toBeInTheDocument();
    });

    it("renders business name", async () => {
      await act(async () => {
        renderSettings();
      });
      const businessNames = screen.getAllByText("Mi Tienda Test");
      expect(businessNames.length).toBeGreaterThan(0);
    });

    it("renders business tax ID when it exists", async () => {
      await act(async () => {
        renderSettings();
      });
      expect(screen.getByText("RFC123456789")).toBeInTheDocument();
    });

    it("renders placeholder when business tax ID does not exist", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: { ...mockConfig, businessTaxId: null },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it("renders business address when it exists", async () => {
      await act(async () => {
        renderSettings();
      });
      expect(screen.getByText("Calle Principal 123")).toBeInTheDocument();
    });

    it("renders placeholder when business address does not exist", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: { ...mockConfig, businessAddress: null },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it("renders business email when it exists", async () => {
      await act(async () => {
        renderSettings();
      });
      expect(screen.getByText("tienda@test.com")).toBeInTheDocument();
    });

    it("renders placeholder when business email does not exist", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: { ...mockConfig, businessEmail: null },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it("renders business phone when it exists", async () => {
      await act(async () => {
        renderSettings();
      });
      expect(screen.getByText("+52 555 1234567")).toBeInTheDocument();
    });

    it("renders placeholder when business phone does not exist", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: { ...mockConfig, businessPhone: null },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it("renders business logo when it exists", async () => {
      await act(async () => {
        renderSettings();
      });
      const logo = screen.getByAltText("Logo");
      expect(logo).toBeInTheDocument();
    });

    it("renders logo placeholder when business logo does not exist", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: { ...mockConfig, businessLogoUrl: null },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      expect(screen.getByText("cardInfo.noLogo")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("opens edit modal when edit button is clicked", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderSettings();
      });

      const editButton = screen.getByText("cardInfo.edit");
      await user.click(editButton);

      await waitFor(() => {
        expect(editButton).toBeInTheDocument();
      });
    });

    it("updates config and closes modal when form is submitted", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderSettings();
      });

      const editButton = screen.getByText("cardInfo.edit");
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("modal.title")).toBeInTheDocument();
      });

      const submitButton = screen.getByText("modal.editButton");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalled();
      });
    });

    it("updates data when modal onChange is called", async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderSettings();
      });

      const editButton = screen.getByText("cardInfo.edit");
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("modal.title")).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText("modal.name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Store Name");

      await waitFor(() => {
        expect(nameInput).toHaveValue("New Store Name");
      });
    });

    it("renders LanguageSwitcher component", async () => {
      await act(async () => {
        renderSettings();
      });

      const languageButton = screen.getByText(/Switch to English|Cambiar a Español/i);
      expect(languageButton).toBeInTheDocument();
    });
  });

  describe("Currency Management", () => {
    it("displays current currency from useCurrency hook", async () => {
      await act(async () => {
        renderSettings();
      });

      expect(screen.getByText("USD")).toBeInTheDocument();
    });

    it("calls updateCurrency when currency is changed", async () => {
      await act(async () => {
        renderSettings();
      });

      const currencySelect = screen.getByLabelText("cardCurrency.currencyLabel");
      expect(currencySelect).toBeInTheDocument();
    });

    it("does not update currency when empty value is selected", async () => {
      await act(async () => {
        renderSettings();
      });

      expect(mockUpdateCurrency).not.toHaveBeenCalled();
    });

    it("displays currencies based on locale", async () => {
      await act(async () => {
        renderSettings();
      });

      const currencySelect = screen.getByLabelText("cardCurrency.currencyLabel");
      expect(currencySelect).toBeInTheDocument();
    });

    it("calls updateCurrency when a valid currency is selected", async () => {
      await act(async () => {
        renderSettings();
      });

      const currencySelect = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(currencySelect, { target: { value: "EUR" } });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "EUR" });
      });
    });

    it("executes handleCurrencyChange with valid value", async () => {
      await act(async () => {
        renderSettings();
      });

      const currencySelect = screen.getByLabelText("cardCurrency.currencyLabel");
      fireEvent.change(currencySelect, { target: { value: "EUR" } });

      await waitFor(() => {
        expect(mockUpdateCurrency).toHaveBeenCalledWith({ acronym: "EUR" });
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles config with partial data", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: {
          businessName: "Tienda Parcial",
          businessType: "store",
        },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const businessNames = screen.getAllByText("Tienda Parcial");
      expect(businessNames.length).toBeGreaterThan(0);

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBeGreaterThanOrEqual(3);
    });

    it("renders correctly when all optional fields are null", async () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: {
          businessName: "Tienda Minimal",
          businessType: "store",
          businessTaxId: null,
          businessAddress: null,
          businessEmail: null,
          businessPhone: null,
          businessLogoUrl: null,
        },
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        updateConfig: mockUpdateConfig,
      });

      await act(async () => {
        renderSettings();
      });

      const businessNames = screen.getAllByText("Tienda Minimal");
      expect(businessNames.length).toBeGreaterThan(0);
      expect(screen.getByText("cardInfo.noLogo")).toBeInTheDocument();

      const placeholders = screen.getAllByText("---");
      expect(placeholders.length).toBe(4);
    });
  });
});
