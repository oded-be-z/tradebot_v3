/**
 * Forex Trading Service
 * Handles major currency pairs and real-time forex data
 */

const axios = require("axios");

class ForexService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 60000; // 1 minute

    // Major currency pairs mapping
    this.currencyPairs = {
      "EUR/USD": "EURUSD",
      "GBP/USD": "GBPUSD",
      "USD/JPY": "USDJPY",
      "USD/CHF": "USDCHF",
      "AUD/USD": "AUDUSD",
      "USD/CAD": "USDCAD",
      "NZD/USD": "NZDUSD",
      "EUR/GBP": "EURGBP",
      "EUR/JPY": "EURJPY",
      "GBP/JPY": "GBPJPY",
    };

    // Reverse mapping for symbol lookups
    this.symbolToPair = {};
    Object.entries(this.currencyPairs).forEach(([pair, symbol]) => {
      this.symbolToPair[symbol] = pair;
    });
  }

  async fetchForexRate(symbol) {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `forex:${upperSymbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Normalize symbol (handle both EUR/USD and EURUSD formats)
    let normalizedSymbol = upperSymbol;
    let displayPair = upperSymbol;

    if (upperSymbol.includes("/")) {
      displayPair = upperSymbol;
      normalizedSymbol = this.currencyPairs[upperSymbol];
    } else if (this.symbolToPair[upperSymbol]) {
      displayPair = this.symbolToPair[upperSymbol];
      normalizedSymbol = upperSymbol;
    }

    if (!normalizedSymbol) {
      return {
        symbol: displayPair,
        rate: null,
        error: "Unsupported currency pair",
        timestamp: Date.now(),
      };
    }

    // Try multiple forex data sources
    const result = await this.tryMultipleSources(normalizedSymbol, displayPair);

    if (result.rate) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  async tryMultipleSources(symbol, displayPair) {
    // Source 1: Polygon Forex (if available)
    if (process.env.POLYGON_API_KEY) {
      try {
        const polygonResult = await this.fetchFromPolygon(symbol, displayPair);
        if (polygonResult.rate) return polygonResult;
      } catch (e) {
        console.log(
          `[Forex] Polygon failed for ${symbol}: ${e.message}, trying alternatives...`,
        );
      }
    }

    // Source 2: Alpha Vantage Forex (if available)
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        const alphaResult = await this.fetchFromAlphaVantage(
          symbol,
          displayPair,
        );
        if (alphaResult.rate) return alphaResult;
      } catch (e) {
        console.log(
          `[Forex] Alpha Vantage failed for ${symbol}: ${e.message}, trying free sources...`,
        );
      }
    }

    // Source 3: Free Forex API
    try {
      const freeResult = await this.fetchFromFreeForexAPI(symbol, displayPair);
      if (freeResult.rate) return freeResult;
    } catch (e) {
      console.log(`[Forex] Free API failed for ${symbol}: ${e.message}`);
    }

    return {
      symbol: displayPair,
      rate: null,
      error: "All forex data sources failed",
      timestamp: Date.now(),
    };
  }

  async fetchFromPolygon(symbol, displayPair) {
    const forexSymbol = `C:${symbol}`;
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${forexSymbol}/prev`,
      {
        params: { apiKey: process.env.POLYGON_API_KEY },
        timeout: 10000,
      },
    );

    if (response.data.results?.[0]) {
      const result = response.data.results[0];
      return {
        symbol: displayPair,
        rate: result.c, // Close rate
        bid: result.l, // Low as bid approximation
        ask: result.h, // High as ask approximation
        change: result.c - (result.pc || result.c),
        changePercent:
          ((result.c - (result.pc || result.c)) / (result.pc || result.c)) *
          100,
        timestamp: Date.now(),
        source: "polygon",
      };
    }

    throw new Error("No data from Polygon");
  }

  async fetchFromAlphaVantage(symbol, displayPair) {
    const fromCurrency = symbol.substring(0, 3);
    const toCurrency = symbol.substring(3, 6);

    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "FX_INTRADAY",
        from_symbol: fromCurrency,
        to_symbol: toCurrency,
        interval: "1min",
        apikey: process.env.ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    const timeSeries = response.data["Time Series FX (1min)"];
    if (timeSeries) {
      const latestTime = Object.keys(timeSeries)[0];
      const latestData = timeSeries[latestTime];

      return {
        symbol: displayPair,
        rate: parseFloat(latestData["4. close"]),
        bid: parseFloat(latestData["3. low"]),
        ask: parseFloat(latestData["2. high"]),
        open: parseFloat(latestData["1. open"]),
        timestamp: Date.now(),
        source: "alphavantage",
      };
    }

    throw new Error("No data from Alpha Vantage");
  }

  async fetchFromFreeForexAPI(symbol, displayPair) {
    // Using exchangerate-api.com (free tier)
    const fromCurrency = symbol.substring(0, 3);
    const toCurrency = symbol.substring(3, 6);

    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
      { timeout: 10000 },
    );

    if (response.data.rates && response.data.rates[toCurrency]) {
      return {
        symbol: displayPair,
        rate: response.data.rates[toCurrency],
        timestamp: Date.now(),
        source: "exchangerate-api",
      };
    }

    throw new Error("No data from free forex API");
  }

  async fetchMultipleRates(pairs) {
    const promises = pairs.map((pair) => this.fetchForexRate(pair));
    return Promise.all(promises);
  }

  getSupportedPairs() {
    return Object.keys(this.currencyPairs);
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }
}

module.exports = ForexService;
