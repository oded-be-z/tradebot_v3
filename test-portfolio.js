const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function testPortfolioUploads() {
  console.log("📁 Starting Portfolio Upload and Analysis Tests...\n");
  const results = [];

  const testFiles = [
    {
      name: "portfolio-standard.csv",
      description: "Standard CSV with symbol,shares,purchase_price",
      expectedSymbols: [
        "AAPL",
        "MSFT",
        "GOOGL",
        "TSLA",
        "AMZN",
        "NVDA",
        "META",
        "BTC",
        "ETH",
        "GC",
      ],
      shouldPass: true,
    },
    {
      name: "portfolio-alternative.csv",
      description:
        "Alternative format with ticker,quantity,cost,date_purchased",
      expectedSymbols: ["SPY", "QQQ", "DIA", "ARKK", "VTI"],
      shouldPass: true,
    },
    {
      name: "portfolio-mixed.csv",
      description: "Mixed case headers and different naming",
      expectedSymbols: ["aapl", "MSFT", "btc", "GC", "CL"],
      shouldPass: true,
    },
    {
      name: "portfolio-invalid.csv",
      description: "Invalid format with company names instead of symbols",
      expectedSymbols: [],
      shouldPass: false,
    },
  ];

  for (const testFile of testFiles) {
    console.log(`\n📄 Testing: ${testFile.name}`);
    console.log(`Description: ${testFile.description}`);

    try {
      const sessionId = `test-portfolio-${testFile.name}-${Date.now()}`;

      // Test 1: Upload Portfolio
      console.log("  → Step 1: Uploading portfolio...");

      const formData = new FormData();
      formData.append(
        "file",
        fs.createReadStream(`test-data/${testFile.name}`),
      );
      formData.append("sessionId", sessionId);

      const uploadResponse = await axios.post(
        "http://localhost:3000/api/portfolio/upload",
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 15000,
        },
      );

      const uploadResult = {
        testFile: testFile.name,
        step: "upload",
        success: uploadResponse.data.success,
        message: uploadResponse.data.message,
        error: uploadResponse.data.error,
        portfolioData: uploadResponse.data.portfolio,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      };

      console.log(
        `    Upload: ${uploadResult.success ? "SUCCESS ✅" : "FAILED ❌"}`,
      );
      if (uploadResult.error) {
        console.log(`    Error: ${uploadResult.error}`);
      }
      if (uploadResult.message) {
        console.log(`    Message: ${uploadResult.message}`);
      }

      results.push(uploadResult);

      // Test 2: Portfolio Analysis (if upload succeeded)
      if (uploadResult.success) {
        console.log("  → Step 2: Testing portfolio analysis...");

        const analysisQueries = [
          "analyze my portfolio",
          "how is my portfolio doing?",
          "what's my best performer?",
          "portfolio performance summary",
          "show me my holdings",
        ];

        for (const query of analysisQueries) {
          try {
            const analysisResponse = await axios.post(
              "http://localhost:3000/api/chat",
              {
                message: query,
                sessionId: sessionId,
              },
              {
                timeout: 20000,
              },
            );

            const analysisResult = {
              testFile: testFile.name,
              step: "analysis",
              query: query,
              success: analysisResponse.data.success,
              type: analysisResponse.data.type,
              response: analysisResponse.data.response,
              responseLength: analysisResponse.data.response
                ? analysisResponse.data.response.length
                : 0,
              hasChart: !!analysisResponse.data.chartData,
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
            };

            // Quality checks for portfolio analysis
            const responseText = analysisResponse.data.response
              ? analysisResponse.data.response.toLowerCase()
              : "";
            analysisResult.mentionsPortfolio =
              responseText.includes("portfolio") ||
              responseText.includes("holdings") ||
              responseText.includes("position");
            analysisResult.hasPerformanceData =
              responseText.includes("%") ||
              responseText.includes("gain") ||
              responseText.includes("loss") ||
              responseText.includes("profit");
            analysisResult.hasStockMentions = testFile.expectedSymbols.some(
              (symbol) => responseText.includes(symbol.toLowerCase()),
            );
            analysisResult.isNotError =
              !responseText.includes("no portfolio") &&
              !responseText.includes("please upload");

            analysisResult.passed =
              analysisResult.success &&
              analysisResult.isNotError &&
              analysisResult.responseLength > 100 &&
              (analysisResult.mentionsPortfolio ||
                analysisResult.hasStockMentions);

            console.log(
              `    "${query}": ${analysisResult.passed ? "PASS ✅" : "FAIL ❌"}`,
            );
            console.log(
              `      → Type: ${analysisResult.type}, Portfolio: ${analysisResult.mentionsPortfolio ? "✅" : "❌"}, Data: ${analysisResult.hasPerformanceData ? "✅" : "❌"}`,
            );

            results.push(analysisResult);

            // Small delay between analysis queries
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.log(`    "${query}": ERROR ❌ - ${error.message}`);
            results.push({
              testFile: testFile.name,
              step: "analysis",
              query: query,
              error: error.message,
              success: false,
              passed: false,
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Test 3: Specific Stock Analysis within Portfolio Context
        console.log(
          "  → Step 3: Testing stock analysis with portfolio context...",
        );

        if (testFile.expectedSymbols.length > 0) {
          const symbol = testFile.expectedSymbols[0];
          const stockQuery = `how is ${symbol} doing in my portfolio?`;

          try {
            const stockResponse = await axios.post(
              "http://localhost:3000/api/chat",
              {
                message: stockQuery,
                sessionId: sessionId,
              },
              {
                timeout: 20000,
              },
            );

            const stockResult = {
              testFile: testFile.name,
              step: "stock_context",
              query: stockQuery,
              symbol: symbol,
              success: stockResponse.data.success,
              type: stockResponse.data.type,
              response: stockResponse.data.response,
              responseLength: stockResponse.data.response
                ? stockResponse.data.response.length
                : 0,
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
            };

            const responseText = stockResponse.data.response
              ? stockResponse.data.response.toLowerCase()
              : "";
            stockResult.mentionsSymbol = responseText.includes(
              symbol.toLowerCase(),
            );
            stockResult.mentionsPortfolio =
              responseText.includes("portfolio") ||
              responseText.includes("holding");
            stockResult.hasContextualInfo =
              stockResult.mentionsSymbol && stockResult.mentionsPortfolio;

            stockResult.passed =
              stockResult.success && stockResult.responseLength > 50;

            console.log(
              `    "${stockQuery}": ${stockResult.passed ? "PASS ✅" : "FAIL ❌"}`,
            );
            console.log(
              `      → Symbol: ${stockResult.mentionsSymbol ? "✅" : "❌"}, Context: ${stockResult.hasContextualInfo ? "✅" : "❌"}`,
            );

            results.push(stockResult);
          } catch (error) {
            console.log(`    "${stockQuery}": ERROR ❌ - ${error.message}`);
            results.push({
              testFile: testFile.name,
              step: "stock_context",
              query: stockQuery,
              error: error.message,
              success: false,
              passed: false,
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      // Delay between file tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`  → Upload FAILED ❌: ${error.message}`);
      results.push({
        testFile: testFile.name,
        step: "upload",
        error: error.message,
        success: false,
        passed: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Generate summary
  const uploadTests = results.filter((r) => r.step === "upload");
  const analysisTests = results.filter((r) => r.step === "analysis");
  const stockContextTests = results.filter((r) => r.step === "stock_context");

  const summary = {
    totalFiles: testFiles.length,
    successfulUploads: uploadTests.filter((r) => r.success).length,
    failedUploads: uploadTests.filter((r) => !r.success).length,
    totalAnalysisTests: analysisTests.length,
    passedAnalysisTests: analysisTests.filter((r) => r.passed).length,
    failedAnalysisTests: analysisTests.filter((r) => !r.passed).length,
    totalStockContextTests: stockContextTests.length,
    passedStockContextTests: stockContextTests.filter((r) => r.passed).length,
    failedStockContextTests: stockContextTests.filter((r) => !r.passed).length,
    timestamp: new Date().toISOString(),
  };

  summary.uploadSuccessRate = (
    (summary.successfulUploads / summary.totalFiles) *
    100
  ).toFixed(1);
  summary.analysisPassRate =
    summary.totalAnalysisTests > 0
      ? (
          (summary.passedAnalysisTests / summary.totalAnalysisTests) *
          100
        ).toFixed(1)
      : "0.0";
  summary.stockContextPassRate =
    summary.totalStockContextTests > 0
      ? (
          (summary.passedStockContextTests / summary.totalStockContextTests) *
          100
        ).toFixed(1)
      : "0.0";

  console.log("\n📊 Portfolio Test Summary:");
  console.log(`${"=".repeat(50)}`);
  console.log(
    `File Uploads: ${summary.successfulUploads}/${summary.totalFiles} (${summary.uploadSuccessRate}%)`,
  );
  console.log(
    `Portfolio Analysis: ${summary.passedAnalysisTests}/${summary.totalAnalysisTests} (${summary.analysisPassRate}%)`,
  );
  console.log(
    `Stock Context: ${summary.passedStockContextTests}/${summary.totalStockContextTests} (${summary.stockContextPassRate}%)`,
  );

  // Save detailed results
  const detailedResults = {
    summary,
    results,
    criticalIssues: results
      .filter((r) => !r.success && !r.passed)
      .map((r) => ({
        testFile: r.testFile,
        step: r.step,
        query: r.query,
        issue: r.error || "Failed validation checks",
        details: r,
      })),
  };

  fs.writeFileSync(
    "test-results/portfolio-test-results.json",
    JSON.stringify(detailedResults, null, 2),
  );
  console.log(
    "\n💾 Detailed results saved to test-results/portfolio-test-results.json",
  );

  return summary;
}

// Run the test if called directly
if (require.main === module) {
  testPortfolioUploads().catch(console.error);
}

module.exports = { testPortfolioUploads };
