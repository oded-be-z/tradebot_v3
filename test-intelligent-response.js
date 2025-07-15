// Test file for IntelligentResponse module
const IntelligentResponse = require("./services/intelligentResponse");

async function testTrendAnalysis() {
  console.log("=== Testing Trend Analysis ===\n");

  // Test 1: Oil trends
  console.log('Test 1: "oil trends"');
  const oilResult = await IntelligentResponse.generateResponse(
    "oil trends",
    {},
  );
  console.log("Result type:", oilResult.type);
  if (oilResult.type === "error") {
    console.log("Error:", oilResult.message);
  } else {
    console.log("Symbol:", oilResult.symbol);
    console.log("Current Price:", oilResult.currentPrice);
    console.log(
      "Explanation preview:",
      oilResult.explanation.substring(0, 200) + "...",
    );
  }
  console.log("\n---\n");

  // Test 2: Gold analysis
  console.log('Test 2: "tell me about gold"');
  const goldResult = await IntelligentResponse.generateResponse(
    "tell me about gold",
    {},
  );
  console.log("Result type:", goldResult.type);
  console.log("Symbol extracted:", goldResult.symbol || "None");
  console.log("\n---\n");

  // Test 3: Bitcoin trends
  console.log('Test 3: "bitcoin trends"');
  const btcResult = await IntelligentResponse.generateResponse(
    "bitcoin trends",
    {},
  );
  console.log("Result type:", btcResult.type);
  console.log("Symbol:", btcResult.symbol || "None");
  console.log("\n---\n");

  // Test 4: Invalid query
  console.log('Test 4: "trends" (no symbol)');
  const invalidResult = await IntelligentResponse.generateResponse(
    "trends",
    {},
  );
  console.log("Result type:", invalidResult.type);
  console.log("Message:", invalidResult.message);
}

// Run tests
testTrendAnalysis().catch(console.error);
