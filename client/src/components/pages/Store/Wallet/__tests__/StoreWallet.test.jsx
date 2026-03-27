import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthContext } from "@/providers/auth/AuthProvider";
import * as walletService from "@/services/walletService";
import * as useModulesHook from "@hooks/useModules";
import * as usePaymentWebsocketHook from "@hooks/usePaymentWebsocket";
import { I18nProvider } from "@i18n/I18nProvider";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { Wallet } from "../Wallet";

const mockNodeInfo = {
  nodeId: "test-node-id",
  channels: [
    {
      channelId: "channel-1",
      balanceSat: 50000,
      capacitySat: 100000,
      inboundLiquiditySat: 50000,
    },
  ],
  chain: "mainnet",
  blockHeight: 800000,
  version: "1.0.0",
};

const mockIncomingTransactions = [
  {
    paymentHash: "hash1",
    receivedSat: 1000,
    completedAt: Date.now() - 3600000,
    description: "Test incoming payment",
  },
];

const mockOutgoingTransactions = [
  {
    paymentHash: "hash2",
    recipientAmountSat: 500,
    routingFeeSat: 5,
    completedAt: Date.now() - 7200000,
    invoice: "lnbc1...",
  },
];

function renderStoreWallet() {
  const mockAuthContext = {
    user: { userName: "testuser", userId: 1 },
    isAuth: true,
  };

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <I18nProvider>
        <Wallet />
      </I18nProvider>
    </AuthContext.Provider>,
  );
}

const originalWarn = console.warn;
const originalError = console.error;

const defaultNavigation = [
  {
    path: "/store/wallet",
    label: "wallet",
    icon: "wallet",
    showInNavbar: true,
  },
];

const mockLogout = jest.fn();
const mockUpdateConfig = jest.fn();

const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
};

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

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
       args[0].includes("Unknown event handler property") ||
       args[0].includes("validateDOMNesting"))
    ) {
      return;
    }

    if (
      args[0] instanceof Error &&
      (args[0].message === "Connection failed" || args[0].message === "Failed to fetch")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();
  localStorageMock.clear();

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

  jest.spyOn(walletService, "loginWallet").mockResolvedValue({});
  jest.spyOn(walletService, "logoutWallet").mockResolvedValue({});
  jest.spyOn(walletService, "getInfo").mockResolvedValue(mockNodeInfo);
  jest.spyOn(walletService, "getIncomingTransactions").mockResolvedValue(mockIncomingTransactions);
  jest.spyOn(walletService, "getOutgoingTransactions").mockResolvedValue(mockOutgoingTransactions);
  jest.spyOn(walletService, "createInvoice").mockResolvedValue({
    serialized: "lnbc1000n1...",
    paymentHash: "mock-payment-hash",
  });
  jest.spyOn(walletService, "payInvoiceFromService").mockResolvedValue({
    recipientAmountSat: 1000,
    routingFeeSat: 5,
    paymentHash: "mock-payment-hash",
  });

  jest.spyOn(usePaymentWebsocketHook, "usePaymentWebsocket").mockReturnValue({
    setInvoiceHash: jest.fn(),
    setFetchers: jest.fn(),
    onPayment: jest.fn(() => jest.fn()),
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("StoreWallet Component", () => {
  describe("Page Header", () => {
    it("renders wallet title", async () => {
      await act(async () => {
        renderStoreWallet();
      });

      expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders wallet subtitle", async () => {
      await act(async () => {
        renderStoreWallet();
      });

      expect(screen.getByText("subtitle")).toBeInTheDocument();
    });
  });

  describe("WalletGuard Authentication", () => {
    it("shows wallet guard modal on initial load", async () => {
      await act(async () => {
        renderStoreWallet();
      });

      expect(screen.getByText("access.title")).toBeInTheDocument();
      expect(screen.getByLabelText("access.passwordLabel")).toBeInTheDocument();
    });

    it("allows access with valid password", async () => {
      await act(async () => {
        renderStoreWallet();
      });

      const passwordInput = screen.getByLabelText("access.passwordLabel");
      const confirmButton = screen.getByText("access.confirmText");

      await userEvent.type(passwordInput, "password123");
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(walletService.loginWallet).toHaveBeenCalledWith("password123");
      });

      await waitFor(() => {
        expect(walletService.getInfo).toHaveBeenCalled();
      });
    });

    it("does not restore wallet access automatically after mount", async () => {
      await act(async () => {
        renderStoreWallet();
      });

      expect(walletService.getInfo).not.toHaveBeenCalled();
      expect(screen.getByText("access.title")).toBeInTheDocument();
    });
  });

  describe("Wallet Content After Authentication", () => {
    async function authenticateAndWait() {
      await act(async () => {
        renderStoreWallet();
      });

      const passwordInput = screen.getByLabelText("access.passwordLabel");
      const confirmButton = screen.getByText("access.confirmText");

      await userEvent.type(passwordInput, "password123");
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(walletService.getInfo).toHaveBeenCalled();
      });
    }

    it("fetches and displays node info after authentication", async () => {
      await authenticateAndWait();

      await waitFor(() => {
        expect(screen.getByText("nodeInfo.title")).toBeInTheDocument();
      });
    });

    it("fetches transactions after authentication", async () => {
      await authenticateAndWait();

      await waitFor(() => {
        expect(walletService.getIncomingTransactions).toHaveBeenCalled();
        expect(walletService.getOutgoingTransactions).toHaveBeenCalled();
      });
    });

    it("shows loading state before node info is fetched", async () => {
      jest.spyOn(walletService, "getInfo").mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockNodeInfo), 100)),
      );

      await act(async () => {
        renderStoreWallet();
      });

      const passwordInput = screen.getByLabelText("access.passwordLabel");
      const confirmButton = screen.getByText("access.confirmText");

      await userEvent.type(passwordInput, "password123");
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText("loadingMessage")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles phoenixd connection error gracefully", async () => {
      jest.spyOn(walletService, "getInfo").mockRejectedValue(new Error("Connection failed"));

      await act(async () => {
        renderStoreWallet();
      });

      const passwordInput = screen.getByLabelText("access.passwordLabel");
      const confirmButton = screen.getByText("access.confirmText");

      await userEvent.type(passwordInput, "password123");
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(walletService.getInfo).toHaveBeenCalled();
      });
    });

    it("handles transaction fetch error", async () => {
      jest.spyOn(walletService, "getIncomingTransactions").mockRejectedValue(
        new Error("Failed to fetch"),
      );

      await act(async () => {
        renderStoreWallet();
      });

      const passwordInput = screen.getByLabelText("access.passwordLabel");
      const confirmButton = screen.getByText("access.confirmText");

      await userEvent.type(passwordInput, "password123");
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(walletService.getIncomingTransactions).toHaveBeenCalled();
      });
    });
  });
});
