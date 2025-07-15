const axios = require("axios");

const SERVER_URL = "http://localhost:3000";

// Test categories
const testCategories = {
  "Bitcoin Queries": [
    "bitcoin price?",
    "bitcoin trends?",
    "bitcoin last 30 days?",
    "BTC analysis",
    "btc price",
    "analyze bitcoin",
    "what is bitcoin price today?",
    "bitcoin vs ethereum",
  ],

  "Oil Queries": [
    "oil price?",
    "oil prices?",
    "crude oil",
    "CL analysis",
    "WTI price",
    "brent oil",
    "analyze oil",
  ],

  "Gold/Silver Queries": [
    "gold price",
    "silver price",
    "gold vs silver?",
    "GC analysis",
    "precious metals",
    "analyze gold",
  ],

  "Stock Queries": [
    "AAPL price",
    "apple stock",
    "MSFT analysis",
    "tesla stock price",
    "analyze GOOGL",
  ],

  "Trend Queries": [
    "bitcoin trends?",
    "oil trends",
    "gold trend analysis",
    "AAPL trend",
  ],

  "Historical Queries": [
    "bitcoin last 30 days?",
    "oil last week",
    "gold historical",
    "AAPL past month",
  ],

  "Comparison Queries": [
    "bitcoin vs ethereum",
    "gold vs silver?",
    "oil vs gas",
    "AAPL vs MSFT",
  ],
};

async function testQuery(query, category) {
  try {
    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: query,
      sessionId: "debug_test_" + Date.now(),
    });

    const data = response.data;

    const result = {
      query: query,
      category: category,
      success: true,
      symbol: data.symbol || "N/A",
      responseType: data.type || "unknown",
      hasPrice: !!(data.marketData && data.marketData.price),
      price: data.marketData?.price || null,
      error: data.error || null,
    };

    // Extract what asset the response is actually about
    if (data.response) {
      const responseText = data.response.substring(0, 200);

      // Check what the response is actually about
      if (responseText.includes("BTC") || responseText.includes("Bitcoin")) {
        result.actualAsset = "Bitcoin";
      } else if (
        responseText.includes("CL") ||
        responseText.includes("oil") ||
        responseText.includes("WTI")
      ) {
        result.actualAsset = "Oil";
      } else if (responseText.includes("GC") || responseText.includes("Gold")) {
        result.actualAsset = "Gold";
      } else if (
        responseText.includes("SI") ||
        responseText.includes("Silver")
      ) {
        result.actualAsset = "Silver";
      } else if (
        responseText.includes("ETH") ||
        responseText.includes("Ethereum")
      ) {
        result.actualAsset = "Ethereum";
      } else if (responseText.match(/[A-Z]{2,5} Analysis/)) {
        const match = responseText.match(/([A-Z]{2,5}) Analysis/);
        result.actualAsset = match[1];
      } else {
        result.actualAsset = "Unknown";
      }
    }

    // Check if the response matches the query intent
    if (
      query.toLowerCase().includes("bitcoin") ||
      query.toLowerCase().includes("btc")
    ) {
      result.expectedAsset = "Bitcoin";
      result.correct =
        result.actualAsset === "Bitcoin" || result.actualAsset === "BTC";
    } else if (
      query.toLowerCase().includes("oil") ||
      query.toLowerCase().includes("crude")
    ) {
      result.expectedAsset = "Oil";
      result.correct =
        result.actualAsset === "Oil" || result.actualAsset === "CL";
    } else if (query.toLowerCase().includes("gold")) {
      result.expectedAsset = "Gold";
      result.correct =
        result.actualAsset === "Gold" || result.actualAsset === "GC";
    } else if (query.toLowerCase().includes("silver")) {
      result.expectedAsset = "Silver";
      result.correct =
        result.actualAsset === "Silver" || result.actualAsset === "SI";
    } else {
      result.correct = true; // Can't verify other queries easily
    }

    return result;
  } catch (error) {
    return {
      query: query,
      category: category,
      success: false,
      error: error.message,
      correct: false,
    };
  }
}

async function runTests() {
  console.log("🔍 Comprehensive Debug Test Suite");
  console.log("==================================\n");

  const allResults = [];
  let correctCount = 0;
  let incorrectCount = 0;

  for (const [category, queries] of Object.entries(testCategories)) {
    console.log(`\n📋 Testing ${category}`);
    console.log("-".repeat(50));

    for (const query of queries) {
      const result = await testQuery(query, category);
      allResults.push(result);

      if (result.success) {
        const statusIcon = result.correct ? "✅" : "❌";
        console.log(`${statusIcon} "${query}"`);
        console.log(
          `   Expected: ${result.expectedAsset || "N/A"}, Got: ${result.actualAsset}`,
        );
        console.log(
          `   Symbol: ${result.symbol}, Type: ${result.responseType}`,
        );

        if (!result.correct) {
          console.log(`   ⚠️  MISMATCH DETECTED!`);
          incorrectCount++;
        } else {
          correctCount++;
        }
      } else {
        console.log(`❌ "${query}" - Error: ${result.error}`);
        incorrectCount++;
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log("\n\n📊 TEST SUMMARY");
  console.log("================");
  console.log(`Total Tests: ${allResults.length}`);
  console.log(`✅ Correct: ${correctCount}`);
  console.log(`❌ Incorrect: ${incorrectCount}`);
  console.log(
    `Success Rate: ${((correctCount / allResults.length) * 100).toFixed(1)}%`,
  );

  // Analyze patterns
  console.log("\n\n🔍 PATTERN ANALYSIS");
  console.log("===================");

  const mismatches = allResults.filter((r) => r.success && !r.correct);
  if (mismatches.length > 0) {
    console.log("\nMismatched Queries:");
    mismatches.forEach((m) => {
      console.log(
        `- "${m.query}": Expected ${m.expectedAsset}, Got ${m.actualAsset}`,
      );
    });
  }

  // Check symbol extraction
  console.log("\n\nSymbol Extraction Issues:");
  const symbolIssues = allResults.filter(
    (r) => r.success && r.symbol === "N/A",
  );
  symbolIssues.forEach((s) => {
    console.log(`- "${s.query}": No symbol extracted`);
  });

  return allResults;
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(SERVER_URL);
    return true;
  } catch (error) {
    console.log("❌ Server is not running at", SERVER_URL);
    console.log("Please start the server with: npm start");
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await runTests();
})();
