import { calculateReportTotalSatoshis, formatSatoshis } from "../reportSatoshis";

const bitcoinPricesByCurrency = { usd: 100000, eur: 50000 };
const getBitcoinPrice = jest.fn(async (currency) => bitcoinPricesByCurrency[currency]);

function buildCurrencyGroup(currencyAcronym, totalAmountCents) {
  return { currencyAcronym, totalAmountCents };
}

describe("calculateReportTotalSatoshis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("converts each fiat total to sats and sums them", async () => {
    const currencyGroups = [buildCurrencyGroup("USD", 25000), buildCurrencyGroup("EUR", 5000)];

    await expect(calculateReportTotalSatoshis(currencyGroups, getBitcoinPrice)).resolves.toBe(350000);
    expect(getBitcoinPrice).toHaveBeenCalledWith("usd");
    expect(getBitcoinPrice).toHaveBeenCalledWith("eur");
  });

  it("adds bitcoin totals without fetching a price", async () => {
    const currencyGroups = [buildCurrencyGroup("BTC", 1), buildCurrencyGroup("USD", 25000)];

    await expect(calculateReportTotalSatoshis(currencyGroups, getBitcoinPrice)).resolves.toBe(1250000);
    expect(getBitcoinPrice).toHaveBeenCalledTimes(1);
  });

  it("rejects when a price cannot be fetched", async () => {
    const failingGetBitcoinPrice = jest.fn().mockRejectedValue(new Error("Unable to get BTC price"));

    await expect(
      calculateReportTotalSatoshis([buildCurrencyGroup("USD", 25000)], failingGetBitcoinPrice),
    ).rejects.toThrow("Unable to get BTC price");
  });
});

describe("formatSatoshis", () => {
  it("adds the sats unit", () => {
    expect(formatSatoshis(350000)).toBe(`${(350000).toLocaleString()} sats`);
  });
});
