const axios = require("axios");
const fs = require("fs");

const assetTests = {
  stocks: [
    { query: "AAPL analysis", expectedSymbol: "AAPL", asset: "stock" },
    { query: "MSFT vs GOOGL", expectedType: "comparison", asset: "stock" },
    { query: "tech stocks overview", expectedType: "analysis", asset: "stock" },
    { query: "SPY trends", expectedSymbol: "SPY", asset: "etf" },
    { query: "Tesla stock forecast", expectedSymbol: "TSLA", asset: "stock" },
    { query: "nvidia earnings", expectedSymbol: "NVDA", asset: "stock" },
  ],
  crypto: [
    { query: "bitcoin price", expectedSymbol: "BTC", asset: "crypto" },
    { query: "ETH vs BTC", expectedType: "comparison", asset: "crypto" },
    {
      query: "crypto market overview",
      expectedType: "analysis",
      asset: "crypto",
    },
    { query: "dogecoin trends", expectedSymbol: "DOGE", asset: "crypto" },
    { query: "is crypto crashing?", expectedType: "analysis", asset: "crypto" },
    { query: "ethereum forecast", expectedSymbol: "ETH", asset: "crypto" },
  ],
  commodities: [
    { query: "gold price", expectedSymbol: "GC", asset: "commodity" },
    { query: "oil trends", expectedSymbol: "CL", asset: "commodity" },
    { query: "silver vs gold", expectedType: "comparison", asset: "commodity" },
    { query: "copper analysis", expectedSymbol: "HG", asset: "commodity" },
    { query: "natural gas forecast", expectedSymbol: "NG", asset: "commodity" },
    { query: "wheat price today", expectedSymbol: "ZW", asset: "commodity" },
  ],
  mixed: [
    {
      query: "bitcoin vs gold",
      expectedType: "comparison",
      assets: ["crypto", "commodity"],
    },
    {
      query: "AAPL vs GC",
      expectedType: "comparison",
      assets: ["stock", "commodity"],
    },
    {
      query: "oil vs tech stocks",
      expectedType: "comparison",
      assets: ["commodity", "stock"],
    },
    { query: "commodity trends", expectedType: "analysis", asset: "commodity" },
    {
      query: "crypto vs stocks performance",
      expectedType: "comparison",
      assets: ["crypto", "stock"],
    },
  ],
};

async function testAssetTypes() {
  console.log("🏷️  Starting Asset Type Testing...\n");
  const results = [];
  const sessionId = `test-assets-${Date.now()}`;

  for (const [assetCategory, tests] of Object.entries(assetTests)) {
    console.log(`\n📈 Testing ${assetCategory.toUpperCase()} Assets:`);
    console.log(`${"=".repeat(50)}`);

    for (const testCase of tests) {
      try {
        console.log(`\nTesting: "${testCase.query}"`);

        const response = await axios.post(
          "http://localhost:3000/api/chat",
          {
            message: testCase.query,
            sessionId: sessionId,
          },
          {
            timeout: 20000,
          },
        );

        const result = {
          category: assetCategory,
          query: testCase.query,
          expectedAsset: testCase.asset || testCase.assets,
          expectedSymbol: testCase.expectedSymbol,
          expectedType: testCase.expectedType,
          actualType: response.data.type || "unknown",
          actualSymbol: response.data.metadata?.symbol,
          response: response.data.response,
          responseLength: response.data.response
            ? response.data.response.length
            : 0,
          hasChart: !!response.data.chartData,
          success: response.data.success,
          status: "completed",
          timestamp: new Date().toISOString(),
        };

        // Check if response is appropriate for asset type
        const responseText = response.data.response
          ? response.data.response.toLowerCase()
          : "";

        // Asset-specific validation
        if (assetCategory === "stocks") {
          result.mentionsStock =
            responseText.includes("stock") ||
            responseText.includes("equity") ||
            responseText.includes("shares");
        } else if (assetCategory === "crypto") {
          result.mentionsCrypto =
            responseText.includes("bitcoin") ||
            responseText.includes("crypto") ||
            responseText.includes("ethereum") ||
            responseText.includes("blockchain");
        } else if (assetCategory === "commodities") {
          result.mentionsCommodity =
            responseText.includes("gold") ||
            responseText.includes("oil") ||
            responseText.includes("commodity") ||
            responseText.includes("futures");
        }

        // Symbol accuracy check
        if (testCase.expectedSymbol && result.actualSymbol) {
          result.symbolMatch = result.actualSymbol === testCase.expectedSymbol;
        }

        // Type accuracy check
        if (testCase.expectedType) {
          result.typeMatch =
            result.actualType &&
            result.actualType
              .toLowerCase()
              .includes(testCase.expectedType.toLowerCase());
        }

        // Quality checks
        result.hasPrice =
          responseText.includes("$") || responseText.includes("price");
        result.hasChange =
          responseText.includes("%") || responseText.includes("change");
        result.hasInsight = result.responseLength > 200; // Substantial response
        result.isNotGeneric =
          !responseText.includes("i'm max") &&
          !responseText.includes("please specify");

        // Overall pass/fail logic
        const conditions = [];

        if (testCase.expectedSymbol) {
          conditions.push(result.symbolMatch);
        }
        if (testCase.expectedType) {
          conditions.push(result.typeMatch);
        }
        conditions.push(result.success);
        conditions.push(result.hasInsight);
        conditions.push(result.isNotGeneric);

        result.passed =
          conditions.every((c) => c === true) && conditions.length > 0;

        results.push(result);

        // Console output
        console.log(`  → Type: ${result.actualType}`);
        if (result.actualSymbol) {
          console.log(
            `  → Symbol: ${result.actualSymbol} ${result.symbolMatch ? "✅" : "❌"}`,
          );
        }
        if (testCase.expectedType) {
          console.log(`  → Type Match: ${result.typeMatch ? "✅" : "❌"}`);
        }
        console.log(
          `  → Quality: Price=${result.hasPrice ? "✅" : "❌"}, Change=${result.hasChange ? "✅" : "❌"}, Insight=${result.hasInsight ? "✅" : "❌"}`,
        );
        console.log(`  → Overall: ${result.passed ? "PASS ✅" : "FAIL ❌"}`);
      } catch (error) {
        console.log(`  → ERROR: ${error.message} ❌`);
        results.push({
          category: assetCategory,
          query: testCase.query,
          error: error.message,
          status: "error",
          passed: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Generate category summaries
  const categoryResults = {};
  for (const category of Object.keys(assetTests)) {
    const categoryTests = results.filter((r) => r.category === category);
    categoryResults[category] = {
      total: categoryTests.length,
      passed: categoryTests.filter((r) => r.passed).length,
      failed: categoryTests.filter((r) => !r.passed).length,
      errors: categoryTests.filter((r) => r.status === "error").length,
      passRate: (
        (categoryTests.filter((r) => r.passed).length / categoryTests.length) *
        100
      ).toFixed(1),
    };
  }

  // Overall summary
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
    categoryResults,
    timestamp: new Date().toISOString(),
    sessionId,
  };

  console.log("\n📊 Asset Type Test Summary:");
  console.log(`${"=".repeat(50)}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Errors: ${errorTests} 🚨`);
  console.log(`Overall Pass Rate: ${summary.passRate}%`);

  console.log("\n📈 By Asset Category:");
  for (const [category, stats] of Object.entries(categoryResults)) {
    console.log(
      `${category.toUpperCase()}: ${stats.passed}/${stats.total} (${stats.passRate}%)`,
    );
  }

  // Save detailed results
  const detailedResults = {
    summary,
    categoryResults,
    results,
    criticalIssues: results
      .filter((r) => !r.passed)
      .map((r) => ({
        category: r.category,
        query: r.query,
        issue: r.error || `Failed validation checks`,
        details: r,
      })),
  };

  fs.writeFileSync(
    "test-results/asset-type-test-results.json",
    JSON.stringify(detailedResults, null, 2),
  );
  console.log(
    "\n💾 Detailed results saved to test-results/asset-type-test-results.json",
  );

  return summary;
}

// Run the test if called directly
if (require.main === module) {
  testAssetTypes().catch(console.error);
}

module.exports = { testAssetTypes };
