const axios = require("axios");

const SERVER_URL = "http://localhost:3000";

async function testQuery(query, expectedSymbol) {
  try {
    console.log(`\nTesting: "${query}"`);

    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: query,
      sessionId: "test_session_" + Date.now(),
    });

    const data = response.data;

    if (data.error) {
      console.log("❌ Error:", data.error);
      return false;
    }

    if (data.symbol) {
      console.log("✅ Symbol detected:", data.symbol);
    }

    if (data.marketData && data.marketData.price) {
      console.log("✅ Price:", `$${data.marketData.price.toFixed(2)}`);
      console.log(
        "✅ Change:",
        `${data.marketData.changePercent?.toFixed(2)}%`,
      );
      console.log("✅ Volume:", data.marketData.volume?.toLocaleString());
      console.log("✅ Data source:", data.marketData.source || "fallback");
    }

    if (data.response) {
      console.log(
        "📝 Response preview:",
        data.response.substring(0, 150) + "...",
      );
    }

    return true;
  } catch (error) {
    console.log(
      "❌ Request failed:",
      error.response?.data?.error || error.message,
    );
    return false;
  }
}

async function runTests() {
  console.log("\n🚀 Testing Market Data Fixes");
  console.log("================================");

  // Test cases that previously failed
  const testCases = [
    // Crypto tests
    { query: "bitcoin price?", expectedSymbol: "BTC" },
    { query: "BTC price", expectedSymbol: "BTC" },
    { query: "ethereum price", expectedSymbol: "ETH" },
    { query: "ETH analysis", expectedSymbol: "ETH" },

    // Commodity tests
    { query: "oil price?", expectedSymbol: "CL" },
    { query: "crude oil price", expectedSymbol: "CL" },
    { query: "gold price", expectedSymbol: "GC" },
    { query: "GC analysis", expectedSymbol: "GC" },

    // Stock tests
    { query: "AAPL price", expectedSymbol: "AAPL" },
    { query: "apple stock", expectedSymbol: "AAPL" },
    { query: "MSFT analysis", expectedSymbol: "MSFT" },

    // Edge cases
    { query: "XYZ123 price", expectedSymbol: "XYZ123" }, // Invalid symbol
    { query: "what is the price?", expectedSymbol: null }, // No symbol
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = await testQuery(test.query, test.expectedSymbol);
    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n================================");
  console.log("📊 Test Results:");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`,
  );

  // Test specific API fallback behavior
  console.log("\n🔧 Testing Fallback Mechanisms");
  console.log("================================");

  // Test with a symbol that might fail on some APIs
  await testQuery("DOGE price", "DOGE");
  await testQuery("palladium price", "PA");
}

// Check if server is running
async function checkServer() {
  try {
    // Try to access the main page instead of /health
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
