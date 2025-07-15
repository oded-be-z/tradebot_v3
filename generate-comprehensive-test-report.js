const fs = require("fs");
const path = require("path");

function generateComprehensiveTestReport() {
  console.log("📊 Generating Comprehensive FinanceBot Pro Test Report...\n");

  const timestamp = new Date().toISOString();
  const testResultsDir = "test-results";

  // Load all test result files
  const testResults = {};

  try {
    // NLP Test Results
    if (fs.existsSync(path.join(testResultsDir, "nlp-test-results.json"))) {
      testResults.nlp = JSON.parse(
        fs.readFileSync(
          path.join(testResultsDir, "nlp-test-results.json"),
          "utf8",
        ),
      );
    }

    // Asset Type Test Results
    if (
      fs.existsSync(path.join(testResultsDir, "asset-type-test-results.json"))
    ) {
      testResults.assetTypes = JSON.parse(
        fs.readFileSync(
          path.join(testResultsDir, "asset-type-test-results.json"),
          "utf8",
        ),
      );
    }

    // Portfolio Test Results
    if (
      fs.existsSync(path.join(testResultsDir, "portfolio-test-results.json"))
    ) {
      testResults.portfolio = JSON.parse(
        fs.readFileSync(
          path.join(testResultsDir, "portfolio-test-results.json"),
          "utf8",
        ),
      );
    }
  } catch (error) {
    console.error("Error loading test result files:", error.message);
  }

  // Calculate overall statistics
  const overallStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errorTests: 0,
    passRate: 0,
    categories: {},
  };

  // Process NLP results
  if (testResults.nlp?.summary) {
    const nlp = testResults.nlp.summary;
    overallStats.totalTests += nlp.totalTests;
    overallStats.passedTests += nlp.passedTests;
    overallStats.failedTests += nlp.failedTests;
    overallStats.errorTests += nlp.errorTests;

    overallStats.categories.nlp = {
      name: "NLP & Query Understanding",
      total: nlp.totalTests,
      passed: nlp.passedTests,
      failed: nlp.failedTests,
      errors: nlp.errorTests,
      passRate: nlp.passRate,
      status: parseFloat(nlp.passRate) >= 70 ? "PASS" : "FAIL",
    };
  }

  // Process Asset Type results
  if (testResults.assetTypes?.summary) {
    const assets = testResults.assetTypes.summary;
    overallStats.totalTests += assets.totalTests;
    overallStats.passedTests += assets.passedTests;
    overallStats.failedTests += assets.failedTests;
    overallStats.errorTests += assets.errorTests;

    overallStats.categories.assetTypes = {
      name: "Asset Type Handling",
      total: assets.totalTests,
      passed: assets.passedTests,
      failed: assets.failedTests,
      errors: assets.errorTests,
      passRate: assets.passRate,
      status: parseFloat(assets.passRate) >= 70 ? "PASS" : "FAIL",
      breakdown: assets.categoryResults,
    };
  }

  // Process Portfolio results
  if (testResults.portfolio?.summary) {
    const portfolio = testResults.portfolio.summary;
    const totalPortfolioTests =
      portfolio.totalAnalysisTests +
      portfolio.totalStockContextTests +
      portfolio.totalFiles;
    const passedPortfolioTests =
      portfolio.passedAnalysisTests +
      portfolio.passedStockContextTests +
      portfolio.successfulUploads;
    const failedPortfolioTests = totalPortfolioTests - passedPortfolioTests;
    const portfolioPassRate =
      totalPortfolioTests > 0
        ? ((passedPortfolioTests / totalPortfolioTests) * 100).toFixed(1)
        : "0.0";

    overallStats.totalTests += totalPortfolioTests;
    overallStats.passedTests += passedPortfolioTests;
    overallStats.failedTests += failedPortfolioTests;

    overallStats.categories.portfolio = {
      name: "Portfolio Management",
      total: totalPortfolioTests,
      passed: passedPortfolioTests,
      failed: failedPortfolioTests,
      errors: 0,
      passRate: portfolioPassRate,
      status: parseFloat(portfolioPassRate) >= 70 ? "PASS" : "FAIL",
      breakdown: {
        uploads: {
          passed: portfolio.successfulUploads,
          total: portfolio.totalFiles,
          rate: portfolio.uploadSuccessRate,
        },
        analysis: {
          passed: portfolio.passedAnalysisTests,
          total: portfolio.totalAnalysisTests,
          rate: portfolio.analysisPassRate,
        },
        context: {
          passed: portfolio.passedStockContextTests,
          total: portfolio.totalStockContextTests,
          rate: portfolio.stockContextPassRate,
        },
      },
    };
  }

  // Calculate overall pass rate
  overallStats.passRate =
    overallStats.totalTests > 0
      ? ((overallStats.passedTests / overallStats.totalTests) * 100).toFixed(1)
      : "0.0";

  // Identify critical issues
  const criticalIssues = [];

  // Add critical issues from each test category
  if (testResults.nlp?.criticalIssues) {
    criticalIssues.push(
      ...testResults.nlp.criticalIssues.map((issue) => ({
        ...issue,
        category: "NLP",
        severity: "HIGH",
      })),
    );
  }

  if (testResults.assetTypes?.criticalIssues) {
    criticalIssues.push(
      ...testResults.assetTypes.criticalIssues.map((issue) => ({
        ...issue,
        category: "Asset Types",
        severity: "HIGH",
      })),
    );
  }

  if (testResults.portfolio?.criticalIssues) {
    criticalIssues.push(
      ...testResults.portfolio.criticalIssues.map((issue) => ({
        ...issue,
        category: "Portfolio",
        severity: "MEDIUM",
      })),
    );
  }

  // Identify top issues
  const topIssues = [
    {
      issue: "Symbol Recognition Failure",
      description:
        "System consistently returns AAPL data regardless of query symbol",
      impact: "CRITICAL",
      affectedQueries: [
        "bitcoin price",
        "gold price",
        "oil trends",
        "SPY analysis",
      ],
      recommendation: "Fix symbol parsing in IntelligentResponse service",
    },
    {
      issue: "Portfolio Context Lost",
      description: "Portfolio analysis queries fail despite successful uploads",
      impact: "HIGH",
      affectedQueries: ["analyze my portfolio", "portfolio performance"],
      recommendation: "Fix session-portfolio linking in chat endpoint",
    },
    {
      issue: "Missing Explanatory Content",
      description:
        'Trend analysis lacks "why" explanations for market movements',
      impact: "MEDIUM",
      affectedQueries: ["AAPL trends", "oil trends", "bitcoin direction"],
      recommendation: "Enhance trend analysis to include fundamental reasons",
    },
    {
      issue: "Comparison Table Quality",
      description:
        "Some comparison queries return generic responses instead of tables",
      impact: "MEDIUM",
      affectedQueries: ["compare Google and Amazon", "GOLD COMPARED TO SILVER"],
      recommendation: "Improve comparison query detection patterns",
    },
  ];

  // Success criteria evaluation
  const successCriteria = {
    visual: {
      status: "NOT_TESTED",
      description: "Dark theme consistency, responsive layout",
    },
    nlp: {
      status:
        parseFloat(overallStats.categories.nlp?.passRate || 0) >= 70
          ? "PASS"
          : "FAIL",
      description: "All query variations understood correctly",
      actual: `${overallStats.categories.nlp?.passRate || 0}% pass rate`,
    },
    assets: {
      status:
        parseFloat(overallStats.categories.assetTypes?.passRate || 0) >= 50
          ? "PARTIAL"
          : "FAIL",
      description: "Stocks, crypto, commodities all work",
      actual: `${overallStats.categories.assetTypes?.passRate || 0}% pass rate`,
    },
    portfolio: {
      status:
        testResults.portfolio?.summary?.successfulUploads >= 2
          ? "PARTIAL"
          : "FAIL",
      description: "All CSV formats parse correctly",
      actual: `${testResults.portfolio?.summary?.successfulUploads || 0}/${testResults.portfolio?.summary?.totalFiles || 0} uploads successful`,
    },
    guardrails: {
      status: "NOT_TESTED",
      description: "Non-financial queries politely redirected",
    },
    comparisons: {
      status: "PARTIAL",
      description: "Show TABLES not charts",
      actual: "Some comparisons work, others fail",
    },
    trends: {
      status: "PARTIAL",
      description: "Include WHY explanations",
      actual: "Trend analysis present but lacks explanations",
    },
    quality: {
      status: parseFloat(overallStats.passRate) >= 60 ? "PARTIAL" : "FAIL",
      description: "No generic responses, actual insights",
      actual: `${overallStats.passRate}% overall quality`,
    },
    performance: { status: "NOT_TESTED", description: "<2s response time" },
    errors: {
      status: "PARTIAL",
      description: "Graceful handling, helpful messages",
    },
  };

  // Generate recommendations
  const recommendations = [
    {
      priority: "CRITICAL",
      title: "Fix Symbol Recognition System",
      description:
        "The IntelligentResponse service is not properly extracting symbols from queries, defaulting to AAPL for all requests.",
      steps: [
        "Review symbol extraction logic in intelligentResponse.js",
        "Test regex patterns for different asset types",
        "Add symbol validation and error handling",
        "Verify market data service symbol mapping",
      ],
    },
    {
      priority: "HIGH",
      title: "Restore Portfolio-Chat Integration",
      description:
        "Portfolio data is uploaded successfully but not accessible during chat analysis.",
      steps: [
        "Check session management between upload and chat endpoints",
        "Verify portfolio data persistence in session storage",
        "Test portfolio retrieval in IntelligentResponse",
        "Add portfolio context to analysis queries",
      ],
    },
    {
      priority: "MEDIUM",
      title: "Enhance Response Quality",
      description: "Add explanatory content and reduce generic responses.",
      steps: [
        'Implement "why" explanations for trend analysis',
        "Add fundamental analysis context",
        "Improve query pattern recognition",
        "Add market context to price movements",
      ],
    },
    {
      priority: "LOW",
      title: "Complete Test Coverage",
      description: "Add missing test categories for full validation.",
      steps: [
        "Implement visual/UI testing",
        "Add guardrails testing",
        "Create performance benchmarks",
        "Add error handling edge cases",
      ],
    },
  ];

  // Generate final report object
  const comprehensiveReport = {
    metadata: {
      reportDate: timestamp,
      testDuration: "Approximately 10 minutes",
      serverVersion: "FinanceBot Pro v4.0",
      environment: "development",
      totalTestFiles: Object.keys(testResults).length,
    },
    executiveSummary: {
      overallStatus:
        parseFloat(overallStats.passRate) >= 70 ? "PASS" : "REQUIRES_FIXES",
      overallPassRate: overallStats.passRate,
      totalTests: overallStats.totalTests,
      criticalIssuesCount: criticalIssues.filter((i) => i.severity === "HIGH")
        .length,
      readinessAssessment:
        parseFloat(overallStats.passRate) >= 70
          ? "System shows good fundamental capability with some areas for improvement."
          : "System requires critical fixes before production deployment.",
    },
    testResults: {
      summary: overallStats,
      categoryBreakdown: overallStats.categories,
      detailedResults: testResults,
    },
    qualityAssessment: {
      successCriteria,
      topIssues,
      criticalIssues: criticalIssues.slice(0, 10), // Top 10 critical issues
    },
    recommendations,
    appendix: {
      testDataFiles: [
        "test-results/nlp-test-results.json",
        "test-results/asset-type-test-results.json",
        "test-results/portfolio-test-results.json",
      ],
      serverLogs: "server.log",
      testEnvironment: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: timestamp,
      },
    },
  };

  // Save comprehensive report
  fs.writeFileSync(
    "test-results/comprehensive-test-report.json",
    JSON.stringify(comprehensiveReport, null, 2),
  );

  // Generate HTML report
  const htmlReport = generateHTMLReport(comprehensiveReport);
  fs.writeFileSync("test-results/comprehensive-test-report.html", htmlReport);

  // Console output
  console.log("📊 COMPREHENSIVE TEST REPORT SUMMARY");
  console.log("=====================================");
  console.log(`Report Date: ${new Date(timestamp).toLocaleString()}`);
  console.log(
    `Overall Status: ${comprehensiveReport.executiveSummary.overallStatus}`,
  );
  console.log(`Overall Pass Rate: ${overallStats.passRate}%`);
  console.log(`Total Tests: ${overallStats.totalTests}`);
  console.log(`Passed: ${overallStats.passedTests} ✅`);
  console.log(`Failed: ${overallStats.failedTests} ❌`);
  console.log(`Errors: ${overallStats.errorTests} 🚨`);

  console.log("\n📈 Category Breakdown:");
  for (const [key, category] of Object.entries(overallStats.categories)) {
    console.log(
      `${category.name}: ${category.passed}/${category.total} (${category.passRate}%) ${category.status}`,
    );
  }

  console.log("\n🚨 Top Issues:");
  topIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.issue} (${issue.impact})`);
    console.log(`   ${issue.description}`);
  });

  console.log("\n📋 Critical Recommendations:");
  recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
    console.log(`   ${rec.description}`);
  });

  console.log("\n💾 Report Files Generated:");
  console.log("- test-results/comprehensive-test-report.json");
  console.log("- test-results/comprehensive-test-report.html");

  return comprehensiveReport;
}

function generateHTMLReport(report) {
  const {
    metadata,
    executiveSummary,
    testResults,
    qualityAssessment,
    recommendations,
  } = report;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinanceBot Pro - Comprehensive Test Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #e0e0e0;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #2d2d2d;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        h1, h2, h3 {
            color: #4CAF50;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        h1 { font-size: 2.5em; margin-bottom: 30px; }
        h2 { font-size: 1.8em; margin-top: 40px; }
        h3 { font-size: 1.3em; margin-top: 25px; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: #3d3d3d;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        .summary-card h4 {
            margin: 0 0 10px 0;
            color: #4CAF50;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #fff;
        }
        
        .status-pass { color: #4CAF50; }
        .status-fail { color: #f44336; }
        .status-partial { color: #ff9800; }
        .status-not-tested { color: #9e9e9e; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #3d3d3d;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #555;
        }
        th {
            background: #4CAF50;
            color: white;
            font-weight: bold;
        }
        tr:hover {
            background: #444;
        }
        
        .issue-card {
            background: #3d3d3d;
            border-left: 4px solid #f44336;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .issue-title {
            font-weight: bold;
            color: #f44336;
            margin-bottom: 8px;
        }
        
        .recommendation-card {
            background: #3d3d3d;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .recommendation-title {
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 8px;
        }
        
        .priority-critical { color: #f44336; font-weight: bold; }
        .priority-high { color: #ff9800; font-weight: bold; }
        .priority-medium { color: #ffeb3b; font-weight: bold; }
        .priority-low { color: #4CAF50; font-weight: bold; }
        
        .metadata {
            background: #3d3d3d;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
        }
        
        ul {
            padding-left: 20px;
        }
        li {
            margin: 5px 0;
        }
        
        .progress-bar {
            background: #555;
            border-radius: 10px;
            overflow: hidden;
            height: 20px;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 FinanceBot Pro - Comprehensive Test Report</h1>
        
        <div class="metadata">
            <strong>Report Generated:</strong> ${new Date(metadata.reportDate).toLocaleString()}<br>
            <strong>Environment:</strong> ${metadata.environment}<br>
            <strong>Version:</strong> ${metadata.serverVersion}<br>
            <strong>Test Duration:</strong> ${metadata.testDuration}
        </div>

        <h2>📊 Executive Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h4>Overall Status</h4>
                <div class="value status-${executiveSummary.overallStatus.toLowerCase().replace("_", "-")}">${executiveSummary.overallStatus}</div>
            </div>
            <div class="summary-card">
                <h4>Pass Rate</h4>
                <div class="value">${executiveSummary.overallPassRate}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${executiveSummary.overallPassRate}%"></div>
                </div>
            </div>
            <div class="summary-card">
                <h4>Total Tests</h4>
                <div class="value">${executiveSummary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h4>Critical Issues</h4>
                <div class="value status-fail">${executiveSummary.criticalIssuesCount}</div>
            </div>
        </div>
        
        <p><strong>Readiness Assessment:</strong> ${executiveSummary.readinessAssessment}</p>

        <h2>📈 Test Category Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Tests</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Pass Rate</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(testResults.categoryBreakdown)
                  .map(
                    ([key, category]) => `
                <tr>
                    <td>${category.name}</td>
                    <td>${category.total}</td>
                    <td>${category.passed}</td>
                    <td>${category.failed}</td>
                    <td>${category.passRate}%</td>
                    <td class="status-${category.status.toLowerCase()}">${category.status}</td>
                </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>

        <h2>🚨 Top Issues</h2>
        ${qualityAssessment.topIssues
          .map(
            (issue, index) => `
        <div class="issue-card">
            <div class="issue-title">${index + 1}. ${issue.issue} (${issue.impact} Impact)</div>
            <p>${issue.description}</p>
            <p><strong>Affected:</strong> ${issue.affectedQueries.join(", ")}</p>
            <p><strong>Recommendation:</strong> ${issue.recommendation}</p>
        </div>
        `,
          )
          .join("")}

        <h2>✅ Success Criteria</h2>
        <table>
            <thead>
                <tr>
                    <th>Criteria</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Actual Result</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(qualityAssessment.successCriteria)
                  .map(
                    ([key, criteria]) => `
                <tr>
                    <td>${key.toUpperCase()}</td>
                    <td class="status-${criteria.status.toLowerCase().replace("_", "-")}">${criteria.status}</td>
                    <td>${criteria.description}</td>
                    <td>${criteria.actual || "N/A"}</td>
                </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>

        <h2>🔧 Recommendations</h2>
        ${recommendations
          .map(
            (rec, index) => `
        <div class="recommendation-card">
            <div class="recommendation-title">
                <span class="priority-${rec.priority.toLowerCase()}">[${rec.priority}]</span> 
                ${index + 1}. ${rec.title}
            </div>
            <p>${rec.description}</p>
            <ul>
                ${rec.steps.map((step) => `<li>${step}</li>`).join("")}
            </ul>
        </div>
        `,
          )
          .join("")}

        <h2>📋 Next Steps</h2>
        <ol>
            <li><strong>Immediate:</strong> Fix symbol recognition system (CRITICAL)</li>
            <li><strong>Short-term:</strong> Restore portfolio-chat integration (HIGH)</li>
            <li><strong>Medium-term:</strong> Enhance response quality and explanations (MEDIUM)</li>
            <li><strong>Long-term:</strong> Complete remaining test coverage (LOW)</li>
        </ol>

        <h2>📁 Test Data Files</h2>
        <ul>
            ${report.appendix.testDataFiles.map((file) => `<li><code>${file}</code></li>`).join("")}
            <li><code>${report.appendix.serverLogs}</code></li>
        </ul>
        
        <hr style="margin: 40px 0; border: 1px solid #555;">
        <p style="text-align: center; color: #888; font-size: 0.9em;">
            Report generated on ${new Date(metadata.reportDate).toLocaleString()} | 
            FinanceBot Pro Test Suite v1.0
        </p>
    </div>
</body>
</html>
  `;
}

// Run the report generation if called directly
if (require.main === module) {
  generateComprehensiveTestReport();
}

module.exports = { generateComprehensiveTestReport };
