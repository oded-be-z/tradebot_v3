// Test new response structure for different asset types
const IntelligentResponse = require("./services/intelligentResponse");

// Mock market data for testing
const mockMarketData = {
  CL: { price: 78.45, changePercent: -0.66, volume: 156000, source: "test" },
  GC: { price: 2034.5, changePercent: 1.25, volume: 123000, source: "test" },
  SI: { price: 24.67, changePercent: 0.89, volume: 89000, source: "test" },
  BTC: { price: 43250.0, changePercent: 3.45, volume: 28500, source: "test" },
  ETH: { price: 2645.0, changePercent: 2.89, volume: 18900, source: "test" },
  AAPL: { price: 195.5, changePercent: 2.34, volume: 45600000, source: "test" },
  TSLA: {
    price: 246.38,
    changePercent: -2.11,
    volume: 78900000,
    source: "test",
  },
  MSFT: {
    price: 428.76,
    changePercent: 1.43,
    volume: 23400000,
    source: "test",
  },
  JPM: { price: 205.75, changePercent: 0.87, volume: 12300000, source: "test" },
  NVDA: {
    price: 879.44,
    changePercent: 4.21,
    volume: 41200000,
    source: "test",
  },
};

// Mock the market data service
IntelligentResponse.getMarketData = async function (symbol) {
  const data = mockMarketData[symbol] || mockMarketData["AAPL"];
  return {
    ...data,
    timestamp: Date.now(),
    high52: data.price * 1.3,
    low52: data.price * 0.7,
  };
};

async function testAsset(query, expectedSymbol) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing: "${query}" (expecting ${expectedSymbol})`);
  console.log("=".repeat(80));

  try {
    const result = await IntelligentResponse.generateResponse(query, {});

    if (result.type === "error") {
      console.log("ERROR:", result.message);
      return;
    }

    if (result.type === "trend_analysis" && result.explanation) {
      console.log("\nExtracted Symbol:", result.symbol);
      console.log("\nResponse Preview:");
      console.log(result.explanation.substring(0, 500) + "...\n");

      // Verify structure
      const hasAllSections =
        result.explanation.includes("Summary Card:") &&
        result.explanation.includes("Key Metrics List:") &&
        result.explanation.includes("Valuable Info:") &&
        result.explanation.includes("Historical Price Range:");

      console.log(
        "Structure Check:",
        hasAllSections ? "✅ All sections present" : "❌ Missing sections",
      );
    } else {
      console.log(
        "Analysis:",
        result.analysis || result.response || "No analysis generated",
      );
    }
  } catch (error) {
    console.log("Test Error:", error.message);
  }
}

async function runAllTests() {
  console.log("Testing New Response Structure Across 10 Different Assets\n");

  const testCases = [
    // Commodities
    ["oil trends", "CL"],
    ["gold analysis", "GC"],
    ["silver price", "SI"],
    ["natural gas trends", "NG"],

    // Crypto
    ["bitcoin analysis", "BTC"],
    ["ethereum trends", "ETH"],

    // Stocks
    ["AAPL stock", "AAPL"],
    ["tesla analysis", "TSLA"],
    ["microsoft trends", "MSFT"],
    ["NVDA price", "NVDA"],
  ];

  for (const [query, symbol] of testCases) {
    await testAsset(query, symbol);
  }

  console.log("\n" + "=".repeat(80));
  console.log("All tests completed!");
}

// Run tests
runAllTests().catch(console.error);
