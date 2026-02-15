import BitcoinPriceService from "../bitcoinPriceService";

let originalFetch;
let service;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
  service = new BitcoinPriceService();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function mockCoinGeckoResponse(currency, price) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ bitcoin: { [currency]: price } }),
  });
}

// ============================
// CoinGecko fetch
// ============================
describe("BitcoinPriceService", () => {
  describe("getBitcoinPrice", () => {
    it("fetches price from CoinGecko API", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 65000));

      const price = await service.getBitcoinPrice("usd");

      expect(price).toBe(65000);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("coingecko.com"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("parses response for different currencies", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("mxn", 1200000));

      const price = await service.getBitcoinPrice("MXN");

      expect(price).toBe(1200000);
    });

    it("returns cached price within 5-minute window", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 65000));

      await service.getBitcoinPrice("usd");
      const cached = await service.getBitcoinPrice("usd");

      expect(cached).toBe(65000);
      // Only one fetch call — second was served from cache
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("refetches after cache expires", async () => {
      const realDateNow = Date.now;
      let now = 1000000;
      Date.now = jest.fn(() => now);

      global.fetch
        .mockReturnValueOnce(mockCoinGeckoResponse("usd", 65000))
        .mockReturnValueOnce(mockCoinGeckoResponse("usd", 66000));

      await service.getBitcoinPrice("usd");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance past 5 minutes (300001 ms)
      now += 300001;
      const newPrice = await service.getBitcoinPrice("usd");

      expect(newPrice).toBe(66000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      Date.now = realDateNow;
    });

    it("uses fallback price for USD on API failure", async () => {
      global.fetch.mockRejectedValue(new Error("network error"));

      const price = await service.getBitcoinPrice("usd");

      expect(price).toBe(45000);
    });

    it("uses fallback price for MXN on API failure", async () => {
      global.fetch.mockRejectedValue(new Error("network error"));

      const price = await service.getBitcoinPrice("mxn");

      expect(price).toBe(900000);
    });

    it("uses fallback price for EUR on API failure", async () => {
      global.fetch.mockRejectedValue(new Error("network error"));

      const price = await service.getBitcoinPrice("eur");

      expect(price).toBe(42000);
    });

    it("throws for unknown currency without fallback", async () => {
      global.fetch.mockRejectedValue(new Error("network error"));

      await expect(service.getBitcoinPrice("jpy")).rejects.toThrow(
        "Unable to get BTC price for jpy",
      );
    });

    it("throws when API returns non-OK status", async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 429 });

      // Should fall back to fallback price for known currency
      const price = await service.getBitcoinPrice("usd");
      expect(price).toBe(45000);
    });
  });

  // ============================
  // Conversions
  // ============================
  describe("fiatToSatoshis", () => {
    it("converts fiat amount to satoshis correctly", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 50000));

      const sats = await service.fiatToSatoshis(50, "usd");

      // 50 / 50000 = 0.001 BTC = 100,000 sats
      expect(sats).toBe(100000);
    });

    it("throws for zero amount", async () => {
      await expect(service.fiatToSatoshis(0, "usd")).rejects.toThrow(
        "Fiat amount must be greater than 0",
      );
    });

    it("throws for negative amount", async () => {
      await expect(service.fiatToSatoshis(-10, "usd")).rejects.toThrow(
        "Fiat amount must be greater than 0",
      );
    });
  });

  describe("satoshisToFiat", () => {
    it("converts satoshis to fiat correctly", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 50000));

      const fiat = await service.satoshisToFiat(100000, "usd");

      // 100000 / 100000000 = 0.001 BTC * 50000 = 50.00
      expect(fiat).toBe(50.0);
    });

    it("rounds to 2 decimal places", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 65432));

      const fiat = await service.satoshisToFiat(12345, "usd");

      // 12345 / 100000000 * 65432 = 8.077...
      expect(fiat).toBe(parseFloat((12345 / 100000000 * 65432).toFixed(2)));
    });

    it("throws for zero satoshis", async () => {
      await expect(service.satoshisToFiat(0, "usd")).rejects.toThrow(
        "Satoshis amount must be greater than 0",
      );
    });

    it("throws for negative satoshis", async () => {
      await expect(service.satoshisToFiat(-100, "usd")).rejects.toThrow(
        "Satoshis amount must be greater than 0",
      );
    });
  });

  // ============================
  // convertDishesToSats
  // ============================
  describe("convertDishesToSats", () => {
    it("converts array of dishes with prices to satoshis", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("mxn", 1000000));

      const dishes = [
        { name: "Tacos", price: 50 },
        { name: "Torta", price: 80 },
      ];

      const result = await service.convertDishesToSats(dishes, "mxn");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Tacos");
      expect(result[0].priceInSats).toBe(Math.round((50 / 1000000) * 100000000));
      expect(result[0].originalPrice).toBe(50);
      expect(result[0].currency).toBe("MXN");

      expect(result[1].name).toBe("Torta");
      expect(result[1].priceInSats).toBe(Math.round((80 / 1000000) * 100000000));
    });

    it("preserves additional dish properties", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 50000));

      const dishes = [{ name: "Burger", price: 10, id: 42, category: "food" }];
      const result = await service.convertDishesToSats(dishes, "usd");

      expect(result[0].id).toBe(42);
      expect(result[0].category).toBe("food");
    });
  });

  // ============================
  // formatSatoshis
  // ============================
  describe("formatSatoshis", () => {
    it("formats satoshis with thousands separator", () => {
      expect(service.formatSatoshis(1000000)).toBe("1,000,000 sats");
    });

    it("formats small amounts", () => {
      expect(service.formatSatoshis(100)).toBe("100 sats");
    });

    it("formats zero", () => {
      expect(service.formatSatoshis(0)).toBe("0 sats");
    });
  });

  // ============================
  // Cache management
  // ============================
  describe("cache management", () => {
    it("clearCache empties the cache", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 65000));

      await service.getBitcoinPrice("usd");
      service.clearCache();

      // Should fetch again after clearing
      await service.getBitcoinPrice("usd");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("getCacheInfo returns info about cached entries", async () => {
      global.fetch.mockReturnValue(mockCoinGeckoResponse("usd", 65000));

      await service.getBitcoinPrice("usd");
      const info = service.getCacheInfo();

      expect(info.usd).toBeDefined();
      expect(info.usd.price).toBe(65000);
      expect(info.usd.expired).toBe(false);
    });
  });
});
