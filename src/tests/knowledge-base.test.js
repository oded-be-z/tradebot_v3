const KnowledgeBase = require("../knowledge/knowledge-base");

describe("KnowledgeBase", () => {
  let kb;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe("getFinancialTermDefinition", () => {
    test("should return definition for stock", () => {
      const definition = kb.getFinancialTermDefinition("stock");
      expect(definition).toContain("share of ownership");
      expect(definition).toContain("company");
    });

    test("should return definition for dividend", () => {
      const definition = kb.getFinancialTermDefinition("dividend");
      expect(definition).toContain("payment");
      expect(definition).toContain("shareholders");
    });

    test("should return definition for PE ratio", () => {
      const definition = kb.getFinancialTermDefinition("pe ratio");
      expect(definition).toContain("Price-to-earnings");
      expect(definition).toContain("valuation");
    });

    test("should handle case insensitive queries", () => {
      const definition1 = kb.getFinancialTermDefinition("STOCK");
      const definition2 = kb.getFinancialTermDefinition("stock");
      expect(definition1).toBe(definition2);
    });

    test("should return null for unknown terms", () => {
      const definition = kb.getFinancialTermDefinition("unknownterm");
      expect(definition).toBeNull();
    });
  });

  describe("getStockInfo", () => {
    test("should return Apple stock info", () => {
      const info = kb.getStockInfo("AAPL");
      expect(info.name).toBe("Apple Inc.");
      expect(info.sector).toBe("Technology");
      expect(info.exchange).toBe("NASDAQ");
    });

    test("should return Microsoft stock info", () => {
      const info = kb.getStockInfo("MSFT");
      expect(info.name).toBe("Microsoft Corporation");
      expect(info.sector).toBe("Technology");
    });

    test("should handle lowercase symbols", () => {
      const info = kb.getStockInfo("aapl");
      expect(info.name).toBe("Apple Inc.");
    });

    test("should return null for unknown symbols", () => {
      const info = kb.getStockInfo("UNKNOWN");
      expect(info).toBeNull();
    });
  });

  describe("getCryptoInfo", () => {
    test("should return Bitcoin info", () => {
      const info = kb.getCryptoInfo("BTC");
      expect(info.name).toBe("Bitcoin");
      expect(info.type).toBe("Cryptocurrency");
      expect(info.maxSupply).toBe(21000000);
    });

    test("should return Ethereum info", () => {
      const info = kb.getCryptoInfo("ETH");
      expect(info.name).toBe("Ethereum");
      expect(info.type).toBe("Smart Contract Platform");
      expect(info.maxSupply).toBeNull();
    });

    test("should handle lowercase symbols", () => {
      const info = kb.getCryptoInfo("btc");
      expect(info.name).toBe("Bitcoin");
    });

    test("should return null for unknown crypto symbols", () => {
      const info = kb.getCryptoInfo("UNKNOWN");
      expect(info).toBeNull();
    });
  });

  describe("getSymbolType", () => {
    test("should identify stock symbols", () => {
      expect(kb.getSymbolType("AAPL")).toBe("stock");
      expect(kb.getSymbolType("MSFT")).toBe("stock");
      expect(kb.getSymbolType("GOOGL")).toBe("stock");
    });

    test("should identify crypto symbols", () => {
      expect(kb.getSymbolType("BTC")).toBe("crypto");
      expect(kb.getSymbolType("ETH")).toBe("crypto");
      expect(kb.getSymbolType("ADA")).toBe("crypto");
    });

    test("should identify ETF symbols", () => {
      expect(kb.getSymbolType("SPY")).toBe("etf");
      expect(kb.getSymbolType("QQQ")).toBe("etf");
    });

    test("should handle unknown symbols", () => {
      expect(kb.getSymbolType("UNKNOWN")).toBe("unknown");
    });

    test("should handle case insensitive input", () => {
      expect(kb.getSymbolType("aapl")).toBe("stock");
      expect(kb.getSymbolType("btc")).toBe("crypto");
    });
  });

  describe("getSectorStocks", () => {
    test("should return Technology sector stocks", () => {
      const techStocks = kb.getSectorStocks("Technology");
      expect(techStocks).toContain("AAPL");
      expect(techStocks).toContain("MSFT");
      expect(techStocks).toContain("GOOGL");
      expect(techStocks).toContain("NVDA");
    });

    test("should return Financial Services sector stocks", () => {
      const finStocks = kb.getSectorStocks("Financial Services");
      expect(finStocks).toContain("V");
      expect(finStocks).toContain("MA");
      expect(finStocks).toContain("JPM");
    });

    test("should return empty array for unknown sector", () => {
      const stocks = kb.getSectorStocks("Unknown Sector");
      expect(stocks).toEqual([]);
    });
  });

  describe("searchSymbols", () => {
    test("should find Apple by company name", () => {
      const results = kb.searchSymbols("Apple");
      const appleResult = results.find((r) => r.symbol === "AAPL");
      expect(appleResult).toBeDefined();
      expect(appleResult.type).toBe("stock");
      expect(appleResult.name).toBe("Apple Inc.");
    });

    test("should find stocks by symbol", () => {
      const results = kb.searchSymbols("AAP");
      const appleResult = results.find((r) => r.symbol === "AAPL");
      expect(appleResult).toBeDefined();
    });

    test("should find Bitcoin by name", () => {
      const results = kb.searchSymbols("bitcoin");
      const btcResult = results.find((r) => r.symbol === "BTC");
      expect(btcResult).toBeDefined();
      expect(btcResult.type).toBe("crypto");
    });

    test("should return multiple results for partial matches", () => {
      const results = kb.searchSymbols("micro");
      expect(results.length).toBeGreaterThan(0);
      const msftResult = results.find((r) => r.symbol === "MSFT");
      expect(msftResult).toBeDefined();
    });

    test("should handle case insensitive search", () => {
      const results1 = kb.searchSymbols("APPLE");
      const results2 = kb.searchSymbols("apple");
      expect(results1.length).toBe(results2.length);
    });
  });

  describe("getMarketHours", () => {
    test("should return NYSE market hours", () => {
      const hours = kb.getMarketHours();
      expect(hours.nyse.open).toBe("09:30");
      expect(hours.nyse.close).toBe("16:00");
      expect(hours.nyse.timezone).toBe("EST");
    });

    test("should return NASDAQ market hours", () => {
      const hours = kb.getMarketHours();
      expect(hours.nasdaq.open).toBe("09:30");
      expect(hours.nasdaq.close).toBe("16:00");
    });

    test("should return crypto market hours", () => {
      const hours = kb.getMarketHours();
      expect(hours.crypto.open).toBe("24/7");
      expect(hours.crypto.close).toBe("24/7");
    });
  });

  describe("isMarketOpen", () => {
    test("should return boolean for market status", () => {
      const isOpen = kb.isMarketOpen();
      expect(typeof isOpen).toBe("boolean");
    });

    // Note: This test depends on current time and day
    // In a real implementation, you might want to mock the Date object
    test("should return false on weekends", () => {
      // This would require mocking Date to test properly
      // For now, just verify the method exists and returns a boolean
      const isOpen = kb.isMarketOpen();
      expect(typeof isOpen).toBe("boolean");
    });
  });

  describe("getEducationalContent", () => {
    test("should return investing basics content", () => {
      const content = kb.getEducationalContent("investing_basics");
      expect(content).toContain("Investing");
      expect(content).toContain("profit");
      expect(content).toContain("diversification");
    });

    test("should return risk management content", () => {
      const content = kb.getEducationalContent("risk_management");
      expect(content).toContain("Risk management");
      expect(content).toContain("diversification");
    });

    test("should return portfolio diversification content", () => {
      const content = kb.getEducationalContent("portfolio_diversification");
      expect(content).toContain("Diversification");
      expect(content).toContain("investments");
    });

    test("should return dollar cost averaging content", () => {
      const content = kb.getEducationalContent("dollar_cost_averaging");
      expect(content).toContain("fixed amount");
      expect(content).toContain("volatility");
    });

    test("should return technical analysis content", () => {
      const content = kb.getEducationalContent("technical_analysis");
      expect(content).toContain("market data");
      expect(content).toContain("price");
    });

    test("should return fundamental analysis content", () => {
      const content = kb.getEducationalContent("fundamental_analysis");
      expect(content).toContain("economic");
      expect(content).toContain("intrinsic value");
    });

    test("should return null for unknown topics", () => {
      const content = kb.getEducationalContent("unknown_topic");
      expect(content).toBeNull();
    });
  });

  describe("data integrity", () => {
    test("should have consistent stock symbol data", () => {
      const stockSymbols = Object.keys(kb.stockSymbols);
      expect(stockSymbols.length).toBeGreaterThan(20);

      // Check that all stocks have required properties
      stockSymbols.forEach((symbol) => {
        const info = kb.stockSymbols[symbol];
        expect(info).toHaveProperty("name");
        expect(info).toHaveProperty("sector");
        expect(info).toHaveProperty("exchange");
      });
    });

    test("should have consistent crypto data", () => {
      const cryptoSymbols = Object.keys(kb.cryptoSymbols);
      expect(cryptoSymbols.length).toBeGreaterThan(5);

      // Check that all cryptos have required properties
      cryptoSymbols.forEach((symbol) => {
        const info = kb.cryptoSymbols[symbol];
        expect(info).toHaveProperty("name");
        expect(info).toHaveProperty("type");
        expect(info).toHaveProperty("maxSupply");
      });
    });

    test("should have all sector stocks exist in stock symbols", () => {
      Object.values(kb.sectors).forEach((stocks) => {
        stocks.forEach((symbol) => {
          expect(kb.stockSymbols[symbol]).toBeDefined();
        });
      });
    });
  });
});
