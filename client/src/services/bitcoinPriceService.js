const sharedPriceCache = new Map();

class BitcoinPriceService {
  constructor() {
    this.cache = sharedPriceCache;
    this.CACHE_DURATION = 60 * 1000;
    this.SATOSHIS_PER_BTC = 100000000;
  }

  async getBitcoinPrice(currency = "usd") {
    const cacheKey = currency.toLowerCase();
    const bitcoinPriceRequestedAt = Date.now();

    if (this.cache.has(cacheKey)) {
      const cachedPriceEntry = this.cache.get(cacheKey);
      if (bitcoinPriceRequestedAt - cachedPriceEntry.timestamp < this.CACHE_DURATION) {
        return cachedPriceEntry.price;
      }
    }

    try {
      const bitcoinPriceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          timeout: 10000,
        },
      );

      if (!bitcoinPriceResponse.ok) {
        throw new Error(`HTTP error! status: ${bitcoinPriceResponse.status}`);
      }

      const bitcoinPriceData = await bitcoinPriceResponse.json();
      const currentBitcoinPrice = bitcoinPriceData.bitcoin[currency.toLowerCase()];

      if (!currentBitcoinPrice) {
        throw new Error(`Price not found for currency: ${currency}`);
      }

      this.cache.set(cacheKey, {
        price: currentBitcoinPrice,
        timestamp: bitcoinPriceRequestedAt,
      });

      return currentBitcoinPrice;
    } catch (bitcoinPriceError) {
      console.warn(`Error fetching BTC price for ${currency}:`, bitcoinPriceError.message);
      throw new Error(`Unable to get BTC price for ${currency}`);
    }
  }

  async getHistoricalBitcoinPrice(dateDDMMYYYY, currency = "usd") {
    const cacheKey = `${dateDDMMYYYY}:${currency.toLowerCase()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).price;
    }

    try {
      const historicalPriceResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${dateDDMMYYYY}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          timeout: 10000,
        },
      );

      if (!historicalPriceResponse.ok) {
        throw new Error(`HTTP error! status: ${historicalPriceResponse.status}`);
      }

      const historicalPriceData = await historicalPriceResponse.json();
      const historicalPrice = historicalPriceData.market_data?.current_price?.[currency.toLowerCase()];

      if (!historicalPrice) {
        throw new Error(`Historical price not found for ${dateDDMMYYYY} in currency: ${currency}`);
      }

      this.cache.set(cacheKey, {
        price: historicalPrice,
        timestamp: Date.now(),
      });

      return historicalPrice;
    } catch (historicalPriceError) {
      console.warn(`Error fetching historical BTC price for ${dateDDMMYYYY} ${currency}:`, historicalPriceError.message);
      throw new Error(`Unable to get historical BTC price for ${dateDDMMYYYY} ${currency}`);
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
    const cacheInfoByKey = {};
    for (const [cacheKey, cacheEntry] of this.cache.entries()) {
      cacheInfoByKey[cacheKey] = {
        price: cacheEntry.price,
        age: Date.now() - cacheEntry.timestamp,
        expired: Date.now() - cacheEntry.timestamp > this.CACHE_DURATION,
      };
    }
    return cacheInfoByKey;
  }
}

export default BitcoinPriceService;
