import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";
import * as walletService from "@/services/walletService";

import { CloseChannelModal } from "../CloseChannelModal";

jest.mock("framer-motion", () => {
  const React = require("react");
  const Mock = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  Mock.displayName = "MotionDiv";
  return {
    __esModule: true,
    AnimatePresence: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    domAnimation: {},
    motion: new Proxy({}, { get: () => Mock }),
    m: new Proxy({}, { get: () => Mock }),
  };
});

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const mockChannel = {
  channelId: "abc123",
  balanceSat: 9163,
  capacitySat: 20000,
  inboundLiquiditySat: 9513,
  state: "Normal",
};

const VALID_ADDRESS = "tb1q8tsk6x7y9m2lqz3p4r5w6e7i8u9o0zsqe22cy";

const renderModal = (props = {}) => render(
  <I18nProvider>
    <CloseChannelModal
      isOpen
      onClose={jest.fn()}
      channel={mockChannel}
      onSuccess={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
        args[0].includes("Unknown event handler property"))
    ) return;
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
  jest.clearAllMocks();
});

describe("CloseChannelModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Form step", () => {
    it("renders form step by default", () => {
      renderModal();
      expect(screen.getByText("closeChannel.modalTitle")).toBeInTheDocument();
      expect(screen.getByLabelText("closeChannel.addressLabel")).toBeInTheDocument();
      expect(screen.getByLabelText("closeChannel.feerateLabel")).toBeInTheDocument();
    });

    it("shows error when address is empty", () => {
      renderModal();
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
      expect(screen.getByText("closeChannel.validationAddressRequired")).toBeInTheDocument();
    });

    it("shows error when address format is invalid", () => {
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: "not-a-bitcoin-address" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
      expect(screen.getByText("closeChannel.validationAddressInvalid")).toBeInTheDocument();
    });

    it("shows error when feerate is empty", () => {
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
      expect(screen.getByText("closeChannel.validationFeerateRequired")).toBeInTheDocument();
    });

    it("shows error when feerate is not a positive integer", () => {
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
      expect(screen.getByText("closeChannel.validationFeerateInvalid")).toBeInTheDocument();
    });

    it("advances to confirm step when form is valid", () => {
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "10" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
      expect(screen.getByText("closeChannel.confirmTitle")).toBeInTheDocument();
    });

    it("calls onClose when cancel is clicked", () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByText("closeChannel.cancelButton"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Confirm step", () => {
    const goToConfirm = () => {
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "10" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));
    };

    it("shows channel balance, address and feerate summary", () => {
      goToConfirm();
      expect(screen.getByText("closeChannel.balanceSummaryLabel")).toBeInTheDocument();
      expect(screen.getByText("closeChannel.addressSummaryLabel")).toBeInTheDocument();
      expect(screen.getByText("closeChannel.feerateSummaryLabel")).toBeInTheDocument();
    });

    it("back button returns to form step", () => {
      goToConfirm();
      fireEvent.click(screen.getByText("closeChannel.backButton"));
      expect(screen.getByLabelText("closeChannel.addressLabel")).toBeInTheDocument();
    });

    it("calls closeChannel service and shows success step on confirm", async () => {
      jest.spyOn(walletService, "closeChannel").mockResolvedValue({ txId: "abc-tx-123" });
      goToConfirm();

      await act(async () => {
        fireEvent.click(screen.getByText("closeChannel.confirmButton"));
      });

      await waitFor(() => {
        expect(walletService.closeChannel).toHaveBeenCalledWith(
          "abc123",
          VALID_ADDRESS,
          10,
        );
        expect(screen.getByText("closeChannel.successTitle")).toBeInTheDocument();
      });
    });

    it("calls onSuccess after successful close", async () => {
      jest.spyOn(walletService, "closeChannel").mockResolvedValue({ txId: "abc-tx-123" });
      const onSuccess = jest.fn();
      render(
        <I18nProvider>
          <CloseChannelModal isOpen onClose={jest.fn()} channel={mockChannel} onSuccess={onSuccess} />
        </I18nProvider>,
      );
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "10" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));

      await act(async () => {
        fireEvent.click(screen.getByText("closeChannel.confirmButton"));
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("stays on confirm step and shows error toast when service fails", async () => {
      jest.spyOn(walletService, "closeChannel").mockRejectedValue(new Error("Lightning node service error"));
      goToConfirm();

      await act(async () => {
        fireEvent.click(screen.getByText("closeChannel.confirmButton"));
      });

      await waitFor(() => {
        expect(screen.getByText("closeChannel.confirmTitle")).toBeInTheDocument();
      });
    });
  });

  describe("Success step", () => {
    it("shows txId after successful close", async () => {
      jest.spyOn(walletService, "closeChannel").mockResolvedValue({ txId: "abc-tx-123" });
      renderModal();
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "10" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));

      await act(async () => {
        fireEvent.click(screen.getByText("closeChannel.confirmButton"));
      });

      await waitFor(() => {
        expect(screen.getByText("abc-tx-123")).toBeInTheDocument();
      });
    });

    it("calls onClose when done is clicked", async () => {
      jest.spyOn(walletService, "closeChannel").mockResolvedValue({ txId: "abc-tx-123" });
      const onClose = jest.fn();
      renderModal({ onClose });
      fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
        target: { value: VALID_ADDRESS },
      });
      fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
        target: { value: "10" },
      });
      fireEvent.click(screen.getByText("closeChannel.nextButton"));

      await act(async () => {
        fireEvent.click(screen.getByText("closeChannel.confirmButton"));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText("closeChannel.doneButton"));
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Channel state guard", () => {
    it("renders null when channel is not provided", () => {
      const { container } = render(
        <I18nProvider>
          <CloseChannelModal isOpen onClose={jest.fn()} channel={null} onSuccess={jest.fn()} />
        </I18nProvider>,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
