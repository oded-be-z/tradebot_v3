const axios = require("axios");
const fs = require("fs");

const nlpTestCases = [
  // Comparison variations
  { query: "AAPL vs MSFT", expectedType: "comparison", shouldHaveTable: true },
  {
    query: "apple versus microsoft",
    expectedType: "comparison",
    shouldHaveTable: true,
  },
  {
    query: "compare Google and Amazon",
    expectedType: "comparison",
    shouldHaveTable: true,
  },
  {
    query: "GOLD COMPARED TO SILVER",
    expectedType: "comparison",
    shouldHaveTable: true,
  },
  { query: "btc vs eth", expectedType: "comparison", shouldHaveTable: true },

  // Trend variations
  { query: "AAPL trends", expectedType: "trend", shouldExplainWhy: true },
  {
    query: "what's the trend for oil?",
    expectedType: "trend",
    shouldExplainWhy: true,
  },
  { query: "bitcoin direction", expectedType: "trend", shouldExplainWhy: true },
  {
    query: "show me tesla forecast",
    expectedType: "trend",
    shouldExplainWhy: true,
  },
  {
    query: "crude oil analysis",
    expectedType: "trend",
    shouldExplainWhy: true,
  },

  // Portfolio queries
  { query: "analyze my portfolio", expectedType: "portfolio" },
  { query: "how are my stocks doing?", expectedType: "portfolio" },
  { query: "portfolio performance", expectedType: "portfolio" },
  { query: "what's my best performer?", expectedType: "portfolio" },

  // Price checks
  { query: "AAPL price", expectedType: "price" },
  { query: "how much is bitcoin?", expectedType: "price" },
  { query: "gold current value", expectedType: "price" },

  // Complex queries
  {
    query: "why is TSLA down today?",
    expectedType: "analysis",
    shouldExplainWhy: true,
  },
  { query: "should I buy NVDA?", expectedType: "analysis" },
  { query: "market crash coming?", expectedType: "analysis" },
];

async function testNLP() {
  console.log("🧠 Starting NLP and Query Understanding Tests...\n");
  const results = [];
  const sessionId = `test-nlp-${Date.now()}`;

  for (const testCase of nlpTestCases) {
    try {
      console.log(`Testing: "${testCase.query}"`);

      const response = await axios.post(
        "http://localhost:3000/api/chat",
        {
          message: testCase.query,
          sessionId: sessionId,
        },
        {
          timeout: 15000,
        },
      );

      const result = {
        query: testCase.query,
        expectedType: testCase.expectedType,
        actualType: response.data.type || "unknown",
        response: response.data.response,
        responseLength: response.data.response
          ? response.data.response.length
          : 0,
        hasChart: !!response.data.chartData,
        status: "completed",
        timestamp: new Date().toISOString(),
      };

      // Check if type matches expectation
      const typeMatches =
        response.data.type &&
        response.data.type
          .toLowerCase()
          .includes(testCase.expectedType.toLowerCase());
      result.typeMatch = typeMatches;

      // Check for table in comparison queries
      if (testCase.shouldHaveTable) {
        const hasTable =
          response.data.response &&
          (response.data.response.includes("<table") ||
            response.data.response.includes("comparison-table") ||
            response.data.response.includes("| ")); // Markdown table
        result.hasTable = hasTable;
        result.tableCheck = hasTable ? "PASS" : "FAIL";
      }

      // Check for explanatory content in trend queries
      if (testCase.shouldExplainWhy) {
        const responseText = response.data.response
          ? response.data.response.toLowerCase()
          : "";
        const hasExplanation =
          responseText.includes("because") ||
          responseText.includes("due to") ||
          responseText.includes("driven by") ||
          responseText.includes("caused by") ||
          responseText.includes("as a result");
        result.hasExplanation = hasExplanation;
        result.explanationCheck = hasExplanation ? "PASS" : "FAIL";
      }

      // Overall pass/fail
      result.passed =
        typeMatches &&
        (!testCase.shouldHaveTable || result.hasTable) &&
        (!testCase.shouldExplainWhy || result.hasExplanation) &&
        result.responseLength > 50; // Must have substantial response

      results.push(result);

      console.log(
        `  → Type: ${result.actualType} (expected: ${testCase.expectedType}) ${result.typeMatch ? "✅" : "❌"}`,
      );
      if (testCase.shouldHaveTable) {
        console.log(`  → Table: ${result.tableCheck}`);
      }
      if (testCase.shouldExplainWhy) {
        console.log(`  → Explanation: ${result.explanationCheck}`);
      }
      console.log(`  → Overall: ${result.passed ? "PASS ✅" : "FAIL ❌"}\n`);
    } catch (error) {
      console.log(`  → ERROR: ${error.message} ❌\n`);
      results.push({
        query: testCase.query,
        expectedType: testCase.expectedType,
        error: error.message,
        status: "error",
        passed: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Generate summary
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  const errorTests = results.filter((r) => r.status === "error").length;

  const summary = {
    totalTests,
    passedTests,
    failedTests,
    errorTests,
    passRate: ((passedTests / totalTests) * 100).toFixed(1),
    timestamp: new Date().toISOString(),
    sessionId,
  };

  console.log("\n📊 NLP Test Summary:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Errors: ${errorTests} 🚨`);
  console.log(`Pass Rate: ${summary.passRate}%`);

  // Save detailed results
  const detailedResults = {
    summary,
    results,
    criticalIssues: results
      .filter((r) => !r.passed)
      .map((r) => ({
        query: r.query,
        issue: r.error || `Expected ${r.expectedType}, got ${r.actualType}`,
        details: r,
      })),
  };

  fs.writeFileSync(
    "test-results/nlp-test-results.json",
    JSON.stringify(detailedResults, null, 2),
  );
  console.log(
    "\n💾 Detailed results saved to test-results/nlp-test-results.json",
  );

  return summary;
}

// Run the test if called directly
if (require.main === module) {
  testNLP().catch(console.error);
}

module.exports = { testNLP };
