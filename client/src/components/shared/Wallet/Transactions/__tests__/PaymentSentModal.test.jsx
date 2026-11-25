import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import { I18nProvider } from "@i18n/I18nProvider";

import { PaymentSentModal } from "../PaymentSentModal";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "USD", symbol: "$", locale: "en-US" },
  }),
}));

jest.mock("@/services/bitcoinPriceService", () => {
  const satoshisToFiat = jest.fn(() => new Promise(() => {}));
  const MockedBitcoinPriceService = jest.fn().mockImplementation(() => ({
    satoshisToFiat,
  }));
  MockedBitcoinPriceService.__mockSatoshisToFiat = satoshisToFiat;

  return {
    __esModule: true,
    default: MockedBitcoinPriceService,
  };
});

const mockSatoshisToFiat = BitcoinPriceService.__mockSatoshisToFiat;

const mockResult = {
  recipientAmountSat: 1000,
  routingFeeSat: 5,
  paymentHash: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  paymentPreimage: "def456abc123def456abc123def456abc123def456abc123def456abc123def4",
};

function renderModal(props = {}) {
  return render(
    <I18nProvider>
      <PaymentSentModal result={mockResult} onClose={() => {}} {...props} />
    </I18nProvider>,
  );
}

describe("PaymentSentModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSatoshisToFiat.mockImplementation(() => new Promise(() => {}));
  });

  describe("Visibility", () => {
    it("is open when result is provided", () => {
      renderModal({ result: mockResult });

      expect(screen.getByText("payments.send.paymentDone")).toBeInTheDocument();
    });

    it("is closed when result is null", () => {
      renderModal({ result: null });

      expect(screen.queryByText("payments.send.paymentDone")).not.toBeInTheDocument();
    });
  });

  describe("Content", () => {
    it("shows success title", () => {
      renderModal();

      expect(screen.getByText("payments.send.paySuccessTitle")).toBeInTheDocument();
    });

    it("displays recipient amount in sats", () => {
      renderModal();

      expect(screen.getByText("1,000 sats")).toBeInTheDocument();
    });

    it("displays routing fee in sats", () => {
      renderModal();

      expect(screen.getByText("5 sats")).toBeInTheDocument();
    });

    it("displays payment hash", () => {
      renderModal();

      expect(screen.getByText(mockResult.paymentHash)).toBeInTheDocument();
    });

    it("displays payment preimage", () => {
      renderModal();

      expect(screen.getByText(mockResult.paymentPreimage)).toBeInTheDocument();
    });

    it("shows copy button for payment hash", () => {
      renderModal();

      expect(screen.getAllByText("payments.send.copyButton")).toHaveLength(2);
    });

    it("shows amount sent label", () => {
      renderModal();

      expect(screen.getByText("payments.send.amountSent")).toBeInTheDocument();
    });

    it("shows routing fee label", () => {
      renderModal();

      expect(screen.getByText("payments.send.routingFee")).toBeInTheDocument();
    });

    it("shows estimated fiat", async () => {
      mockSatoshisToFiat.mockResolvedValueOnce(0.62);
      renderModal();

      expect(screen.getByText("payments.send.estimatedLabel")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("$0.62")).toBeInTheDocument();
      });
    });

    it("shows payment hash label", () => {
      renderModal();

      expect(screen.getByText("payments.send.paymentHash")).toBeInTheDocument();
    });

    it("shows payment preimage label", () => {
      renderModal();

      expect(screen.getByText("payments.send.paymentPreImage")).toBeInTheDocument();
    });
  });

  describe("Close Button", () => {
    it("renders close button", () => {
      renderModal();

      expect(screen.getByText("payments.send.closeButton")).toBeInTheDocument();
    });

    it("calls onClose when close button is pressed", () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      fireEvent.click(screen.getByText("payments.send.closeButton"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
