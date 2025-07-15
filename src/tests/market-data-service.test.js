const MarketDataService = require("../knowledge/market-data-service");

describe("MarketDataService", () => {
  let service;

  beforeEach(() => {
    service = new MarketDataService();
  });

  afterEach(() => {
    if (service && service.cleanup) {
      service.cleanup();
    }
  });

  describe("fetchStockPrice", () => {
    test("should fetch real stock price for AAPL", async () => {
      const result = await service.fetchStockPrice("AAPL");

      expect(result).toHaveProperty("symbol", "AAPL");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("source");
      expect(typeof result.price).toBe("number");
      expect(result.price).toBeGreaterThan(0);
      expect(typeof result.timestamp).toBe("number");
      console.log("AAPL Real Price:", result);
    }, 30000);

    test("should handle invalid stock symbol gracefully", async () => {
      const result = await service.fetchStockPrice("INVALIDXXX");

      expect(result).toHaveProperty("symbol", "INVALIDXXX");
      expect(result).toHaveProperty("error");
      console.log("Invalid Symbol Response:", result);
    }, 30000);

    test("should normalize symbol to uppercase", async () => {
      const result = await service.fetchStockPrice("intc");

      expect(result.symbol).toBe("INTC");
      expect(typeof result.price).toBe("number");
      console.log("Intel (INTC) Real Price:", result);
    }, 30000);

    test("should cache results for 1 minute", async () => {
      const firstCall = await service.fetchStockPrice("MSFT");
      const secondCall = await service.fetchStockPrice("MSFT");

      expect(firstCall.timestamp).toBe(secondCall.timestamp);
      expect(firstCall.price).toBe(secondCall.price);
      console.log("Cache Test - First Call:", firstCall);
      console.log(
        "Cache Test - Second Call identical:",
        firstCall.timestamp === secondCall.timestamp,
      );
    }, 30000);

    test("should fetch stock data from available API source", async () => {
      const result = await service.fetchStockPrice("GOOGL");

      expect(result).toHaveProperty("symbol", "GOOGL");
      expect(result).toHaveProperty("source");
      expect(typeof result.price).toBe("number");
      expect(result.price).toBeGreaterThan(0);
      console.log("Google (GOOGL) Real Price:", result);
    }, 30000);
  });

  describe("fetchCryptoPrice", () => {
    test("should fetch real crypto price for Bitcoin", async () => {
      const result = await service.fetchCryptoPrice("BTC");

      expect(result).toHaveProperty("symbol", "BTC");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("source", "coingecko");
      expect(typeof result.price).toBe("number");
      expect(result.price).toBeGreaterThan(0);
      console.log("Bitcoin Real Price:", result);
    }, 30000);

    test("should map crypto symbols correctly", () => {
      expect(service.getCoinGeckoId("BTC")).toBe("bitcoin");
      expect(service.getCoinGeckoId("ETH")).toBe("ethereum");
      expect(service.getCoinGeckoId("ADA")).toBe("cardano");
    });

    test("should handle unknown crypto symbols", async () => {
      const result = await service.fetchCryptoPrice("UNKNOWNCRYPTO");

      expect(result).toHaveProperty("symbol", "UNKNOWNCRYPTO");
      expect(result).toHaveProperty("error");
      console.log("Unknown Crypto Response:", result);
    }, 30000);
  });

  describe("fetchMultiplePrices", () => {
    test("should fetch multiple real stock prices", async () => {
      const symbols = ["AAPL", "MSFT"];
      const results = await service.fetchMultiplePrices(symbols, "stock");

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("symbol", "AAPL");
      expect(results[1]).toHaveProperty("symbol", "MSFT");
      expect(typeof results[0].price).toBe("number");
      expect(typeof results[1].price).toBe("number");
      console.log("Multiple Stock Prices:", results);
    }, 60000);

    test("should fetch multiple real crypto prices", async () => {
      const symbols = ["BTC", "ETH"];
      const results = await service.fetchMultiplePrices(symbols, "crypto");

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("symbol", "BTC");
      expect(results[1]).toHaveProperty("symbol", "ETH");
      expect(typeof results[0].price).toBe("number");
      expect(typeof results[1].price).toBe("number");
      console.log("Multiple Crypto Prices:", results);
    }, 60000);
  });

  describe("cache management", () => {
    test("should track cache size with real data", async () => {
      expect(service.getCacheSize().total).toBe(0);

      await service.fetchStockPrice("TSLA");
      expect(service.getCacheSize().total).toBe(1);

      await service.fetchCryptoPrice("ETH");
      expect(service.getCacheSize().total).toBe(2);

      console.log("Cache size after 2 calls:", service.getCacheSize());
    }, 60000);

    test("should clear cache completely", async () => {
      await service.fetchStockPrice("NVDA");
      await service.fetchCryptoPrice("BTC");

      expect(service.getCacheSize().total).toBeGreaterThan(0);
      console.log("Cache size before clear:", service.getCacheSize());

      service.clearCache();
      expect(service.getCacheSize().total).toBe(0);
      console.log("Cache size after clear:", service.getCacheSize());
    }, 60000);
  });
});
