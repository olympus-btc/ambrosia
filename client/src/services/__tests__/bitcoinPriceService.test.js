import BitcoinPriceService from "../bitcoinPriceService";

describe("BitcoinPriceService", () => {
  let priceService;

  beforeEach(() => {
    priceService = new BitcoinPriceService();
    priceService.clearCache();
    global.fetch = jest.fn();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the current price from the API on a successful fetch", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bitcoin: { usd: 50000 } }),
    });

    const currentPrice = await priceService.getBitcoinPrice("usd");

    expect(currentPrice).toBe(50000);
  });

  it("throws instead of returning a fallback current price when the network request fails", async () => {
    global.fetch.mockRejectedValue(new Error("network error"));

    await expect(priceService.getBitcoinPrice("usd")).rejects.toThrow(
      "Unable to get BTC price for usd",
    );
  });

  it("throws instead of returning a fallback current price when the response is not ok", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(priceService.getBitcoinPrice("usd")).rejects.toThrow(
      "Unable to get BTC price for usd",
    );
  });

  it("throws instead of returning a fallback current price when the currency is missing from the response", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bitcoin: {} }),
    });

    await expect(priceService.getBitcoinPrice("mxn")).rejects.toThrow(
      "Unable to get BTC price for mxn",
    );
  });

  it("does not cache a current price after a failed fetch", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network error"));
    await expect(priceService.getBitcoinPrice("usd")).rejects.toThrow();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ bitcoin: { usd: 60000 } }),
    });
    const currentPrice = await priceService.getBitcoinPrice("usd");

    expect(currentPrice).toBe(60000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("reuses the cached current price within the cache window instead of refetching", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bitcoin: { usd: 50000 } }),
    });

    await priceService.getBitcoinPrice("usd");
    const secondCurrentPrice = await priceService.getBitcoinPrice("usd");

    expect(secondCurrentPrice).toBe(50000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns the historical price from the API on a successful fetch", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ market_data: { current_price: { usd: 42000 } } }),
    });

    const historicalPrice = await priceService.getHistoricalBitcoinPrice("15-01-2024", "usd");

    expect(historicalPrice).toBe(42000);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=15-01-2024",
      expect.anything(),
    );
  });

  it("throws instead of returning a fallback historical price when the network request fails", async () => {
    global.fetch.mockRejectedValue(new Error("network error"));

    await expect(priceService.getHistoricalBitcoinPrice("15-01-2024", "usd")).rejects.toThrow(
      "Unable to get historical BTC price for 15-01-2024 usd",
    );
  });

  it("throws instead of returning a fallback historical price when the response is not ok", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(priceService.getHistoricalBitcoinPrice("15-01-2024", "usd")).rejects.toThrow(
      "Unable to get historical BTC price for 15-01-2024 usd",
    );
  });

  it("throws instead of returning a fallback historical price when the currency is missing from the response", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ market_data: { current_price: {} } }),
    });

    await expect(priceService.getHistoricalBitcoinPrice("15-01-2024", "mxn")).rejects.toThrow(
      "Unable to get historical BTC price for 15-01-2024 mxn",
    );
  });

  it("does not cache a historical price after a failed fetch", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network error"));
    await expect(priceService.getHistoricalBitcoinPrice("15-01-2024", "usd")).rejects.toThrow();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ market_data: { current_price: { usd: 42000 } } }),
    });
    const historicalPrice = await priceService.getHistoricalBitcoinPrice("15-01-2024", "usd");

    expect(historicalPrice).toBe(42000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("reuses the cached historical price indefinitely instead of refetching", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ market_data: { current_price: { usd: 42000 } } }),
    });

    await priceService.getHistoricalBitcoinPrice("15-01-2024", "usd");
    const secondHistoricalPrice = await priceService.getHistoricalBitcoinPrice("15-01-2024", "usd");

    expect(secondHistoricalPrice).toBe(42000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not confuse a historical price with the current price for the same currency", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bitcoin: { usd: 50000 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ market_data: { current_price: { usd: 42000 } } }),
      });

    const currentPrice = await priceService.getBitcoinPrice("usd");
    const historicalPrice = await priceService.getHistoricalBitcoinPrice("15-01-2024", "usd");

    expect(currentPrice).toBe(50000);
    expect(historicalPrice).toBe(42000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
