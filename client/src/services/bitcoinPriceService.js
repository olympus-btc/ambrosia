class BitcoinPriceService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000;
    this.SATOSHIS_PER_BTC = 100000000;
    this.FALLBACK_PRICES = {
      usd: 45000,
      mxn: 900000,
      eur: 42000,
      btc: 1,
    };
  }

  async getBitcoinPrice(currency = "usd") {
    const cacheKey = currency.toLowerCase();
    const now = Date.now();

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.CACHE_DURATION) {
        return cached.price;
      }
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          timeout: 10000,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const price = data.bitcoin[currency.toLowerCase()];

      if (!price) {
        throw new Error(`Price not found for currency: ${currency}`);
      }

      this.cache.set(cacheKey, {
        price,
        timestamp: now,
      });

      return price;
    } catch (error) {
      console.warn(`Error fetching BTC price for ${currency}:`, error.message);

      const fallbackPrice = this.FALLBACK_PRICES[currency.toLowerCase()];
      if (fallbackPrice) {
        console.warn(`Using fallback price for ${currency}: ${fallbackPrice}`);
        return fallbackPrice;
      }

      throw new Error(`Unable to get BTC price for ${currency}`);
    }
  }

  async fiatToSatoshis(fiatAmount, currency = "usd") {
    if (fiatAmount <= 0) {
      throw new Error("Fiat amount must be greater than 0");
    }

    const btcPrice = await this.getBitcoinPrice(currency);
    const btcAmount = fiatAmount / btcPrice;
    const satoshis = Math.round(btcAmount * this.SATOSHIS_PER_BTC);

    return satoshis;
  }

  async satoshisToFiat(satoshis, currency = "usd") {
    if (satoshis <= 0) {
      throw new Error("Satoshis amount must be greater than 0");
    }

    const btcPrice = await this.getBitcoinPrice(currency);
    const btcAmount = satoshis / this.SATOSHIS_PER_BTC;
    const fiatAmount = btcAmount * btcPrice;

    return parseFloat(fiatAmount.toFixed(2));
  }

  async convertDishesToSats(dishes, currency = "usd") {
    const btcPrice = await this.getBitcoinPrice(currency);

    return dishes.map((dish) => ({
      ...dish,
      priceInSats: Math.round((dish.price / btcPrice) * this.SATOSHIS_PER_BTC),
      originalPrice: dish.price,
      currency: currency.toUpperCase(),
    }));
  }

  formatSatoshis(satoshis) {
    return `${new Intl.NumberFormat("en-US").format(satoshis)} sats`;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheInfo() {
    const info = {};
    for (const [currency, data] of this.cache.entries()) {
      info[currency] = {
        price: data.price,
        age: Date.now() - data.timestamp,
        expired: Date.now() - data.timestamp > this.CACHE_DURATION,
      };
    }
    return info;
  }
}

export default BitcoinPriceService;
