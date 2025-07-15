// Offline test for new response structure
const IntelligentResponse = require("./services/intelligentResponse");
const MarketDataService = require("./src/knowledge/market-data-service");

// Mock the MarketDataService to avoid network calls
const mockData = {
  CL: {
    symbol: "CL",
    price: 78.45,
    changePercent: -0.66,
    volume: 156000,
    source: "mock",
    timestamp: Date.now(),
  },
  GC: {
    symbol: "GC",
    price: 2034.5,
    changePercent: 1.25,
    volume: 123000,
    source: "mock",
    timestamp: Date.now(),
  },
  SI: {
    symbol: "SI",
    price: 24.67,
    changePercent: 0.89,
    volume: 89000,
    source: "mock",
    timestamp: Date.now(),
  },
  NG: {
    symbol: "NG",
    price: 3.45,
    changePercent: -1.23,
    volume: 45000,
    source: "mock",
    timestamp: Date.now(),
  },
  BTC: {
    symbol: "BTC",
    price: 43250.0,
    changePercent: 3.45,
    volume: 28500,
    source: "mock",
    timestamp: Date.now(),
  },
  ETH: {
    symbol: "ETH",
    price: 2645.0,
    changePercent: 2.89,
    volume: 18900,
    source: "mock",
    timestamp: Date.now(),
  },
  AAPL: {
    symbol: "AAPL",
    price: 195.5,
    changePercent: 2.34,
    volume: 45600000,
    source: "mock",
    timestamp: Date.now(),
  },
  TSLA: {
    symbol: "TSLA",
    price: 246.38,
    changePercent: -2.11,
    volume: 78900000,
    source: "mock",
    timestamp: Date.now(),
  },
  MSFT: {
    symbol: "MSFT",
    price: 428.76,
    changePercent: 1.43,
    volume: 23400000,
    source: "mock",
    timestamp: Date.now(),
  },
  NVDA: {
    symbol: "NVDA",
    price: 879.44,
    changePercent: 4.21,
    volume: 41200000,
    source: "mock",
    timestamp: Date.now(),
  },
};

// Override the fetchMarketData method
MarketDataService.prototype.fetchMarketData = async function (symbol) {
  console.log(`[Mock] Returning data for ${symbol}`);
  return (
    mockData[symbol] || {
      symbol,
      price: 100,
      changePercent: 0,
      volume: 1000000,
      source: "mock",
      timestamp: Date.now(),
    }
  );
};

async function testQuery(query, expectedSymbol) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test: "${query}"`);
  console.log("=".repeat(60));

  try {
    const result = await IntelligentResponse.generateResponse(query, {});

    console.log("Type:", result.type);
    console.log("Symbol:", result.symbol || "N/A");

    if (result.type === "trend_analysis" && result.explanation) {
      // Check for all required sections
      const sections = {
        "Summary Card": result.explanation.includes("Summary Card:"),
        "Key Metrics": result.explanation.includes("Key Metrics List:"),
        "Valuable Info": result.explanation.includes("Valuable Info:"),
        "Historical Range": result.explanation.includes(
          "Historical Price Range:",
        ),
      };

      console.log("\nStructure Check:");
      Object.entries(sections).forEach(([name, present]) => {
        console.log(`  ${name}: ${present ? "✅" : "❌"}`);
      });

      // Show first 300 chars of response
      console.log("\nResponse Preview:");
      console.log(result.explanation.substring(0, 300) + "...");
    } else if (result.type === "standard_analysis" && result.analysis) {
      console.log("\nStandard Analysis Generated");
      console.log("Preview:", result.analysis.substring(0, 200) + "...");
    } else if (result.type === "error") {
      console.log("\nError:", result.message);
    }
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

async function runTests() {
  console.log("TESTING NEW RESPONSE STRUCTURE - OFFLINE MODE\n");

  const tests = [
    // Commodities
    "oil trends",
    "gold analysis",
    "silver price",
    "natural gas trends",

    // Crypto
    "bitcoin analysis",
    "ethereum trends",

    // Stocks
    "AAPL stock",
    "tesla analysis",
    "microsoft price",
    "NVDA trends",
  ];

  for (const query of tests) {
    await testQuery(query);
  }

  console.log("\n" + "=".repeat(60));
  console.log("ALL TESTS COMPLETED");
  console.log("=".repeat(60));
}

runTests().catch(console.error);
