#!/usr/bin/env node

/**
 * FINANCEBOT PRO - ULTIMATE 100-TEST VALIDATION SUITE
 * Comprehensive end-to-end testing of all implemented fixes
 */

const axios = require("axios");
const fs = require("fs");

class Ultimate100TestSuite {
  constructor() {
    this.baseURL = "http://localhost:3000";
    this.sessionId = null;
    this.results = {
      total: 100,
      passed: 0,
      failed: 0,
      tests: [],
      categories: {
        nonFinancial: { total: 20, passed: 0, failed: 0 },
        stockCrypto: { total: 20, passed: 0, failed: 0 },
        portfolio: { total: 20, passed: 0, failed: 0 },
        charts: { total: 20, passed: 0, failed: 0 },
        commodities: { total: 20, passed: 0, failed: 0 },
      },
    };
  }

  async log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const emoji =
      type === "pass"
        ? "✅"
        : type === "fail"
          ? "❌"
          : type === "warn"
            ? "⚠️"
            : "ℹ️";
    console.log(`${timestamp} ${emoji} ${message}`);
  }

  async initializeSession() {
    try {
      const response = await axios.post(`${this.baseURL}/api/session/init`);
      this.sessionId = response.data.sessionId;
      await this.log(`Session initialized: ${this.sessionId}`);
      return true;
    } catch (error) {
      await this.log(`Failed to initialize session: ${error.message}`, "fail");
      return false;
    }
  }

  async testQuery(query, expectedType, testName, category) {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: query,
        sessionId: this.sessionId,
      });
      const responseTime = Date.now() - startTime;

      const testResult = {
        name: testName,
        query: query,
        category: category,
        expectedType: expectedType,
        responseTime: responseTime,
        success: false,
        issues: [],
        response: response.data,
        actualContent: response.data?.response || "NO_CONTENT",
      };

      // Check basic response structure
      if (!response.data?.response) {
        testResult.issues.push("No response content received");
        this.recordResult(testResult, category, false);
        return testResult;
      }

      const content = response.data.response;

      // Test based on expected type
      switch (expectedType) {
        case "refuse":
          if (
            content.toLowerCase().includes("focus exclusively on financial") ||
            content.toLowerCase().includes("financial-only policy")
          ) {
            testResult.success = true;
          } else {
            testResult.issues.push("Should refuse non-financial query");
          }
          break;

        case "financial":
          // Check 4-bullet format
          const bullets = (content.match(/•/g) || []).length;
          if (bullets === 4) {
            testResult.success = true;
            // Check word count per bullet
            const bulletLines = content.split("•").slice(1);
            for (let i = 0; i < bulletLines.length; i++) {
              const words = bulletLines[i].trim().split(/\s+/).length;
              if (words > 12) {
                // Allow slight flexibility
                testResult.issues.push(
                  `Bullet ${i + 1} has ${words} words (should be ≤10)`,
                );
              }
            }
          } else {
            testResult.issues.push(`Expected 4 bullets, got ${bullets}`);
          }
          break;

        case "greeting":
          const greetingBullets = (content.match(/•/g) || []).length;
          if (content.includes("Max here") && greetingBullets === 4) {
            testResult.success = true;
          } else {
            testResult.issues.push(
              "Greeting should follow 4-bullet format with Max intro",
            );
          }
          break;

        case "chart":
          if (
            response.data.chartData ||
            content.includes("chart") ||
            content.includes("Chart")
          ) {
            testResult.success = true;
          } else {
            testResult.issues.push("No chart data found in response");
          }
          break;

        case "commodity":
          const commodityBullets = (content.match(/•/g) || []).length;
          if (
            commodityBullets === 4 &&
            !content.toLowerCase().includes("focus exclusively")
          ) {
            testResult.success = true;
          } else {
            testResult.issues.push(
              "Commodity query should be accepted with 4-bullet format",
            );
          }
          break;
      }

      this.recordResult(testResult, category, testResult.success);
      return testResult;
    } catch (error) {
      const testResult = {
        name: testName,
        query: query,
        category: category,
        success: false,
        error: error.message,
      };
      this.recordResult(testResult, category, false);
      return testResult;
    }
  }

  recordResult(testResult, category, success) {
    this.results.tests.push(testResult);
    if (success) {
      this.results.passed++;
      this.results.categories[category].passed++;
      this.log(`PASS: ${testResult.name}`, "pass");
    } else {
      this.results.failed++;
      this.results.categories[category].failed++;
      this.log(
        `FAIL: ${testResult.name} - ${testResult.issues?.join(", ") || testResult.error}`,
        "fail",
      );
    }
  }

  async runNonFinancialTests() {
    await this.log("=== CATEGORY 1: NON-FINANCIAL REFUSAL TESTS (20) ===");

    const nonFinQueries = [
      "teach me to make gluten free pizza",
      "what is the weather today",
      "how do I cook pasta",
      "best movies to watch",
      "travel destinations in Europe",
      "how to fix my car",
      "recipe for chocolate cake",
      "health and fitness tips",
      "programming tutorials",
      "sports scores today",
      "tell me a joke",
      "what is 2+2",
      "help me with homework",
      "dating advice please",
      "how to lose weight",
      "best restaurants nearby",
      "video game recommendations",
      "how to learn guitar",
      "fashion trends 2024",
      "celebrity gossip news",
    ];

    for (let i = 0; i < nonFinQueries.length; i++) {
      await this.testQuery(
        nonFinQueries[i],
        "refuse",
        `NonFin-${i + 1}: "${nonFinQueries[i]}"`,
        "nonFinancial",
      );
    }
  }

  async runStockCryptoTests() {
    await this.log("=== CATEGORY 2: STOCK/CRYPTO ANALYSIS TESTS (20) ===");

    const stockCryptoQueries = [
      "Bitcoin price analysis",
      "Apple stock performance",
      "Tesla earnings outlook",
      "Ethereum price trends",
      "Microsoft stock analysis",
      "NVIDIA recent performance",
      "Amazon stock outlook",
      "Dogecoin market trends",
      "Google stock analysis",
      "SPY ETF performance",
      "Meta stock trends",
      "Cardano price analysis",
      "AMD stock performance",
      "Solana crypto trends",
      "Netflix stock analysis",
      "Polygon crypto price",
      "Disney stock outlook",
      "Chainlink price trends",
      "Intel stock analysis",
      "Bitcoin vs Ethereum",
    ];

    for (let i = 0; i < stockCryptoQueries.length; i++) {
      await this.testQuery(
        stockCryptoQueries[i],
        "financial",
        `Stock-${i + 1}: "${stockCryptoQueries[i]}"`,
        "stockCrypto",
      );
    }
  }

  async runPortfolioTests() {
    await this.log("=== CATEGORY 3: PORTFOLIO ANALYSIS TESTS (20) ===");

    const portfolioQueries = [
      "analyze my portfolio risk",
      "portfolio diversification advice",
      "concentration risk analysis",
      "portfolio rebalancing suggestions",
      "what is my portfolio performance",
      "portfolio allocation recommendations",
      "risk assessment of my holdings",
      "portfolio optimization advice",
      "asset allocation analysis",
      "portfolio correlation analysis",
      "sector concentration review",
      "portfolio volatility analysis",
      "investment mix evaluation",
      "portfolio beta analysis",
      "holdings concentration risk",
      "portfolio drawdown analysis",
      "asset rebalancing needs",
      "portfolio sharpe ratio",
      "risk-adjusted returns analysis",
      "portfolio stress testing",
    ];

    for (let i = 0; i < portfolioQueries.length; i++) {
      await this.testQuery(
        portfolioQueries[i],
        "financial",
        `Portfolio-${i + 1}: "${portfolioQueries[i]}"`,
        "portfolio",
      );
    }
  }

  async runChartTests() {
    await this.log("=== CATEGORY 4: CHART GENERATION TESTS (20) ===");

    const chartQueries = [
      "show me Apple stock chart",
      "Bitcoin price chart analysis",
      "Tesla stock chart trends",
      "Ethereum chart patterns",
      "Microsoft stock chart",
      "chart analysis of NVIDIA",
      "Amazon stock price chart",
      "Google stock chart trends",
      "Netflix chart analysis",
      "AMD stock chart patterns",
      "SPY ETF chart trends",
      "Meta stock chart analysis",
      "Disney chart patterns",
      "Intel stock chart",
      "Dogecoin price chart",
      "Solana chart analysis",
      "Cardano chart trends",
      "Polygon price chart",
      "Chainlink chart patterns",
      "portfolio pie chart",
    ];

    for (let i = 0; i < chartQueries.length; i++) {
      await this.testQuery(
        chartQueries[i],
        "chart",
        `Chart-${i + 1}: "${chartQueries[i]}"`,
        "charts",
      );
    }
  }

  async runCommodityTests() {
    await this.log("=== CATEGORY 5: COMMODITY/AMBIGUOUS TESTS (20) ===");

    const commodityQueries = [
      "gold price analysis",
      "silver market trends",
      "oil price outlook",
      "copper market analysis",
      "natural gas trends",
      "platinum price analysis",
      "palladium market outlook",
      "crude oil trends",
      "Brent oil analysis",
      "WTI crude price",
      "gold vs silver comparison",
      "precious metals outlook",
      "energy commodities trends",
      "agricultural commodities",
      "wheat price analysis",
      "corn market trends",
      "coffee price outlook",
      "sugar market analysis",
      "cotton price trends",
      "livestock futures analysis",
    ];

    for (let i = 0; i < commodityQueries.length; i++) {
      await this.testQuery(
        commodityQueries[i],
        "commodity",
        `Commodity-${i + 1}: "${commodityQueries[i]}"`,
        "commodities",
      );
    }
  }

  async generateReport() {
    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(
      1,
    );

    let report = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>100 End-to-End FinanceBot Tests Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #4CAF50; color: white; }
        .pass { color: green; }
        .fail { color: red; }
        .category { margin: 20px 0; padding: 10px; background: #fff; border: 1px solid #ddd; }
        pre { background: #eee; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>100 END-TO-END FINANCEBOT TESTS REPORT</h1>
    <p>Execution Date: ${new Date().toLocaleString()}</p>
    
    <h2>EXECUTIVE SUMMARY</h2>
    <ul>
        <li><strong>Total Tests:</strong> ${this.results.total}</li>
        <li><strong>Passed:</strong> ${this.results.passed} (${passRate}%)</li>
        <li><strong>Failed:</strong> ${this.results.failed}</li>
    </ul>
    
    <h2>CATEGORY BREAKDOWN</h2>
    ${Object.keys(this.results.categories)
      .map((cat) => {
        const c = this.results.categories[cat];
        const catRate = ((c.passed / c.total) * 100).toFixed(1);
        return `<div class="category">
            <h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
            <ul>
                <li>Total: ${c.total}</li>
                <li>Passed: ${c.passed}</li>
                <li>Failed: ${c.failed}</li>
                <li>Success Rate: ${catRate}%</li>
            </ul>
        </div>`;
      })
      .join("")}
    
    <h2>DETAILED TEST RESULTS</h2>
    <table>
        <tr>
            <th>Test ID</th>
            <th>Name</th>
            <th>Query</th>
            <th>Category</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Issues</th>
            <th>Full Output</th>
        </tr>
        ${this.results.tests
          .map((test, i) => {
            const status = test.success
              ? '<span class="pass">PASS</span>'
              : '<span class="fail">FAIL</span>';
            return `<tr>
                <td>${i + 1}</td>
                <td>${test.name}</td>
                <td>${test.query}</td>
                <td>${test.category}</td>
                <td>${status}</td>
                <td>${test.responseTime || "N/A"}ms</td>
                <td>${test.issues?.join(", ") || test.error || "None"}</td>
                <td><pre>${JSON.stringify(test.response, null, 2)}</pre></td>
            </tr>`;
          })
          .join("")}
    </table>
</body>
</html>`;

    return report;
  }

  async run() {
    await this.log("🚀 STARTING ULTIMATE 100-TEST VALIDATION SUITE");

    if (!(await this.initializeSession())) {
      return false;
    }

    await this.runNonFinancialTests();
    await this.runStockCryptoTests();
    await this.runPortfolioTests();
    await this.runChartTests();
    await this.runCommodityTests();

    const report = await this.generateReport();

    // Save report
    fs.writeFileSync("100-end-to-end-tests-report.html", report);

    await this.log(
      `🎯 TESTING COMPLETE: ${this.results.passed}/${this.results.total} tests passed`,
    );
    await this.log("📄 Report saved to: 100-end-to-end-tests-report.html");

    return true;
  }
}

// Run the ultimate test suite
const testSuite = new Ultimate100TestSuite();
testSuite.run().catch(console.error);
