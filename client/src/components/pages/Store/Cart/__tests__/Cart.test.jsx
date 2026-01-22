import { render, screen, fireEvent, act } from "@testing-library/react";

import * as useModulesHook from "@/hooks/useModules";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as useAuthHook from "@/modules/auth/useAuth";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

import { Cart } from "../Cart";

const mockSetCart = jest.fn();
const mockSetDiscount = jest.fn();
const mockResetCartState = jest.fn();
const mockHandlePay = jest.fn();

jest.mock("../SearchProducts", () => ({
  SearchProducts: ({ onAddProduct }) => (
    <div>
      <button onClick={() => onAddProduct({ id: 1, name: "Jade Wallet", price_cents: 100 })}>
        add-existing
      </button>
      <button onClick={() => onAddProduct({ id: 2, name: "M5 Stick", price_cents: 200 })}>
        add-new
      </button>
    </div>
  ),
}));

jest.mock("../Summary", () => ({
  Summary: ({ onUpdateQuantity, onRemoveProduct, onPay }) => (
    <div>
      <button onClick={() => onUpdateQuantity(1, 0)}>update-zero</button>
      <button onClick={() => onUpdateQuantity(1, 3)}>update-positive</button>
      <button onClick={() => onRemoveProduct(1)}>remove</button>
      <button onClick={() => onPay({})}>pay</button>
    </div>
  ),
}));

jest.mock("../hooks/usePersistentCart", () => ({
  CART_STORAGE_KEY: "store-cart",
  usePersistentCart: () => ({
    cart: [
      { id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 },
    ],
    setCart: mockSetCart,
    discount: 0,
    setDiscount: mockSetDiscount,
    resetCartState: mockResetCartState,
  }),
}));

jest.mock("../../hooks/useProducts", () => ({
  useProducts: () => ({
    products: [
      { id: 1, quantity: 5 },
      { id: 2, quantity: 5 },
    ],
    refetch: jest.fn(),
  }),
}));

jest.mock("../../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
  }),
}));

jest.mock("../hooks/useCartPayment", () => ({
  useCartPayment: () => ({
    handlePay: mockHandlePay,
    isPaying: false,
    paymentError: "",
    clearPaymentError: jest.fn(),
    btcPaymentConfig: null,
    handleBtcInvoiceReady: jest.fn(),
    handleBtcComplete: jest.fn(),
    clearBtcPaymentConfig: jest.fn(),
    cashPaymentConfig: null,
    handleCashComplete: jest.fn(),
    clearCashPaymentConfig: jest.fn(),
  }),
}));

function renderCart() {
  return render(
    <I18nProvider>
      <Cart />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;

const defaultNavigation = [
  {
    path: "/store/cart",
    label: "cart",
    icon: "shopping-cart",
    showInNavbar: true,
  },
];
const mockLogout = jest.fn();
const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
};

beforeEach(() => {
  localStorage.clear();
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
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
    setConfig: jest.fn(),
  });

  jest.spyOn(useAuthHook, "useAuth").mockReturnValue({
    isAuth: true,
    isLoading: false,
    user: { user_id: "user-1", name: "Tester" },
    permissions: [],
    logout: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Cart page", () => {
  it("renders the header and mocked sections", async () => {
    await act(async () => {
      renderCart();
    });
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("add-existing")).toBeInTheDocument();
    expect(screen.getByText("update-zero")).toBeInTheDocument();
  });

  it("adds a new product and increases quantity for existing product", async () => {
    await act(async () => {
      renderCart();
    });

    fireEvent.click(screen.getByText("add-existing"));
    expect(mockSetCart).toHaveBeenCalledWith([
      { id: 1, name: "Jade Wallet", price: 100, quantity: 2, subtotal: 200 },
    ]);

    fireEvent.click(screen.getByText("add-new"));
    expect(mockSetCart).toHaveBeenCalledWith([
      { id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 },
      { id: 2, name: "M5 Stick", price: 200, quantity: 1, subtotal: 200 },
    ]);
  });

  it("updates quantity, removes product when quantity is zero, and forwards pay", async () => {
    await act(async () => {
      renderCart();
    });

    fireEvent.click(screen.getByText("update-positive"));
    expect(mockSetCart).toHaveBeenCalledWith([
      { id: 1, name: "Jade Wallet", price: 100, quantity: 3, subtotal: 300 },
    ]);

    fireEvent.click(screen.getByText("update-zero"));
    expect(mockSetCart).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByText("remove"));
    expect(mockSetCart).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByText("pay"));
    expect(mockHandlePay).toHaveBeenCalledWith({});
  });
});
