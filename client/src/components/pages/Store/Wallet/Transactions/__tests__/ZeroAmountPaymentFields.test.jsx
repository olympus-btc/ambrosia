import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { ZeroAmountPaymentFields } from "../Payment/ZeroAmountPaymentFields";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "USD", symbol: "$", locale: "en-US" },
  }),
}));

function renderZeroAmountPaymentFields(amountStateOverrides = {}) {
  const defaultAmountState = {
    amountInputMode: "sat",
    customEstimateError: "",
    customEstimateValue: "",
    estimatedFiat: null,
    estimatedFiatHasError: false,
    estimatedFiatIsLoading: false,
    estimatedSats: null,
    fiatToSatHasError: false,
    fiatToSatIsLoading: false,
    onAmountChange: jest.fn(),
    onAmountModeChange: jest.fn(),
  };

  return render(
    <I18nProvider>
      <ZeroAmountPaymentFields amountState={{ ...defaultAmountState, ...amountStateOverrides }} />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;

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
});

afterEach(() => {
  console.warn = originalWarn;
  jest.restoreAllMocks();
});

describe("ZeroAmountPaymentFields", () => {
  it("renders the zero-amount title, unit selector, and sat input by default", () => {
    renderZeroAmountPaymentFields();

    expect(screen.getByText("payments.send.confirmModal.zeroAmountTitle")).toBeInTheDocument();
    expect(screen.getByText("payments.send.confirmModal.satsOption")).toBeInTheDocument();
    expect(screen.getByText("payments.send.confirmModal.fiatOption")).toBeInTheDocument();
    expect(screen.getByLabelText("payments.send.confirmModal.zeroAmountLabel")).toBeInTheDocument();
    expect(screen.getByText("payments.send.confirmModal.estimatedLabel")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("calls onAmountModeChange when switching to fiat mode", () => {
    const onAmountModeChange = jest.fn();
    renderZeroAmountPaymentFields({ onAmountModeChange });

    fireEvent.click(screen.getByText("payments.send.confirmModal.fiatOption"));

    expect(onAmountModeChange).toHaveBeenCalledWith("fiat");
  });

  it("renders fiat labels and estimated sats when in fiat mode", () => {
    renderZeroAmountPaymentFields({ amountInputMode: "fiat", customEstimateValue: "1.5", estimatedSats: 5000 });

    expect(screen.getByLabelText("payments.send.confirmModal.zeroAmountFiatLabel")).toBeInTheDocument();
    expect(screen.getByText("payments.send.confirmModal.estimatedLabel")).toBeInTheDocument();
    expect(screen.getByText("5,000 sats")).toBeInTheDocument();
  });

  it("renders 0 sats when fiat mode has no estimated value yet", () => {
    renderZeroAmountPaymentFields({ amountInputMode: "fiat", customEstimateValue: "", estimatedSats: null });

    expect(screen.getByText("payments.send.confirmModal.estimatedLabel")).toBeInTheDocument();
    expect(screen.getByText("0 sats")).toBeInTheDocument();
  });

  it("renders fiat estimate when sat mode has a converted value", () => {
    renderZeroAmountPaymentFields({ amountInputMode: "sat", customEstimateValue: "1000", estimatedFiat: 1.5 });

    expect(screen.getByText("payments.send.confirmModal.estimatedLabel")).toBeInTheDocument();
    expect(screen.getByText("$1.50")).toBeInTheDocument();
  });
});
