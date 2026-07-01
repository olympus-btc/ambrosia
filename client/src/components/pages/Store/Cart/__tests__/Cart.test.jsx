import { render, screen, fireEvent, act } from "@testing-library/react";

import * as useAuthHook from "@/hooks/auth/useAuth";
import * as useNavigationHook from "@/hooks/useNavigation";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

import { Cart } from "../Cart";

const mockSetCart = jest.fn();
const mockSetDiscount = jest.fn();
const mockResetCartState = jest.fn();
const mockHandlePay = jest.fn();
const mockAddProduct = jest.fn();
const mockUpdateQuantity = jest.fn();
const mockRemoveProduct = jest.fn();
const mockClearCart = jest.fn();

jest.mock("../BitcoinPaymentModal", () => ({
  BitcoinPaymentModal: ({ isOpen }) => (isOpen ? <div>btc-modal</div> : null),
}));

jest.mock("../CashPaymentModal", () => ({
  CashPaymentModal: ({ isOpen }) => (isOpen ? <div>cash-modal</div> : null),
}));

jest.mock("../CardPaymentModal", () => ({
  CardPaymentModal: ({ isOpen }) => (isOpen ? <div>card-modal</div> : null),
}));

jest.mock("../SearchProducts", () => ({
  SearchProducts: ({ onAddProduct }) => (
    <div>
      <button onClick={() => onAddProduct({ id: 1, imageUrl: "/uploads/jade.png", name: "Jade Wallet", priceCents: 100 })}>
        add-existing
      </button>
      <button onClick={() => onAddProduct({ id: 2, imageUrl: "/uploads/m5.png", name: "M5 Stick", priceCents: 200 })}>
        add-new
      </button>
    </div>
  ),
}));

jest.mock("../Summary", () => ({
  Summary: ({ cartItems, onUpdateQuantity, onRemoveProduct, onClearCart, startRemoval, onPay }) => (
    <div>
      <span data-testid="summary-count">{cartItems.length}</span>
      <button onClick={() => onUpdateQuantity(1, 0)}>update-zero</button>
      <button onClick={() => onUpdateQuantity(1, 3)}>update-positive</button>
      <button onClick={() => onRemoveProduct(1)}>remove</button>
      <button onClick={() => startRemoval(1, () => onRemoveProduct(1))}>soft-remove</button>
      <button onClick={() => onClearCart()}>clear</button>
      <button onClick={() => onPay({})}>pay</button>
    </div>
  ),
  SummaryModal: ({ isOpen }) => (isOpen ? <div>summary-modal</div> : null),
  MobileSummaryBar: ({ cart, onCheckout }) => (
    cart?.length ? <button onClick={onCheckout}>mobile-checkout</button> : null
  ),
}));

jest.mock("../hooks/useCartOperations", () => ({
  useCartOperations: () => ({
    addProduct: mockAddProduct,
    updateQuantity: mockUpdateQuantity,
    removeProduct: mockRemoveProduct,
    clearCart: mockClearCart,
  }),
}));

const mockSetDiscountType = jest.fn();

jest.mock("../hooks/usePersistentCart", () => ({
  CART_STORAGE_KEY: "store-cart",
  usePersistentCart: () => ({
    cart: [
      { id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 },
    ],
    setCart: mockSetCart,
    discount: 0,
    setDiscount: mockSetDiscount,
    discountType: "percentage",
    setDiscountType: mockSetDiscountType,
    isCartRestored: true,
    resetCartState: mockResetCartState,
  }),
}));

jest.mock("../../hooks/useProducts", () => ({
  useProducts: () => ({
    products: [
      { id: 1, quantity: 5, priceCents: 100 },
      { id: 2, quantity: 5, priceCents: 200 },
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
    btcPayment: {
      config: null,
      onInvoiceReady: jest.fn(),
      onComplete: jest.fn(),
      onClose: jest.fn(),
    },
    cashPayment: {
      config: null,
      onComplete: jest.fn(),
      onClose: jest.fn(),
    },
    cardPayment: {
      config: null,
      onComplete: jest.fn(),
      onClose: jest.fn(),
    },
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
  console.warn = (...warningArgs) => {
    if (
      typeof warningArgs[0] === "string" &&
      warningArgs[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...warningArgs);
  };

  jest.clearAllMocks();

  jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
    availableFeatures: {},
    availableNavigation: defaultNavigation,

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
    user: { userId: "user-1", name: "Tester" },
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

  it("forwards onAddProduct to SearchProducts", async () => {
    await act(async () => {
      renderCart();
    });

    fireEvent.click(screen.getByText("add-existing"));
    expect(mockAddProduct).toHaveBeenCalledWith({ id: 1, imageUrl: "/uploads/jade.png", name: "Jade Wallet", priceCents: 100 }, null);

    fireEvent.click(screen.getByText("add-new"));
    expect(mockAddProduct).toHaveBeenCalledWith({ id: 2, imageUrl: "/uploads/m5.png", name: "M5 Stick", priceCents: 200 }, null);
  });

  it("syncs stale cart prices when products load", async () => {
    await act(async () => {
      renderCart();
    });

    const setCartCalls = mockSetCart.mock.calls;
    const syncCall = setCartCalls.find(([arg]) => typeof arg === "function");
    expect(syncCall).toBeDefined();

    const updater = syncCall[0];
    const staleCart = [{ id: 1, name: "Jade Wallet", price: 50, quantity: 2, subtotal: 100 }];
    const result = updater(staleCart);
    expect(result).toEqual([{ id: 1, name: "Jade Wallet", price: 100, quantity: 2, subtotal: 200 }]);
  });

  it("forwards onUpdateQuantity, onRemoveProduct, and onPay to Summary", async () => {
    await act(async () => {
      renderCart();
    });

    fireEvent.click(screen.getByText("update-positive"));
    expect(mockUpdateQuantity).toHaveBeenCalledWith(1, 3);

    fireEvent.click(screen.getByText("update-zero"));
    expect(mockUpdateQuantity).toHaveBeenCalledWith(1, 0);

    fireEvent.click(screen.getByText("remove"));
    expect(mockRemoveProduct).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText("pay"));
    expect(mockHandlePay).toHaveBeenCalledWith({});
  });

  it("hides items pending removal from totals immediately, before the undo toast expires", async () => {
    jest.useFakeTimers();
    try {
      await act(async () => {
        renderCart();
      });

      expect(screen.getByTestId("summary-count")).toHaveTextContent("1");
      expect(screen.getByText("mobile-checkout")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText("soft-remove"));
      });

      expect(screen.getByTestId("summary-count")).toHaveTextContent("0");
      expect(screen.queryByText("mobile-checkout")).not.toBeInTheDocument();
      expect(mockRemoveProduct).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("clears the cart when clear is pressed", async () => {
    await act(async () => {
      renderCart();
    });

    fireEvent.click(screen.getByText("clear"));
    expect(mockClearCart).toHaveBeenCalled();
  });
});
