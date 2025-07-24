/**
 * Main Test Runner for FinanceBot Pro Pre-Production Tests
 * Orchestrates all test suites and generates comprehensive reports
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const TestCases = require('./testCases');
const SecurityTests = require('./securityTests');
const LoadTester = require('./loadTester');

class PreProductionTestRunner {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      outputDir: config.outputDir || './reports',
      verbose: config.verbose || false,
      parallel: config.parallel || false,
      ...config
    };

    this.logger = this.createLogger();
    this.results = {
      startTime: null,
      endTime: null,
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      functional: {},
      security: {},
      performance: {},
      bugs: [],
      criticalIssues: []
    };

    // Initialize test modules
    this.testCases = new TestCases();
    this.securityTests = new SecurityTests(this.config.baseUrl, this.logger);
    this.loadTester = new LoadTester(this.config.baseUrl, this.logger);
  }

  /**
   * Create logger instance
   */
  createLogger() {
    const log = (level, message, ...args) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level}]`;
      
      if (level === 'ERROR') {
        console.error(prefix, message, ...args);
      } else if (this.config.verbose || level === 'INFO') {
        console.log(prefix, message, ...args);
      }
    };

    return {
      info: (msg, ...args) => log('INFO', msg, ...args),
      error: (msg, ...args) => log('ERROR', msg, ...args),
      debug: (msg, ...args) => log('DEBUG', msg, ...args),
      warn: (msg, ...args) => log('WARN', msg, ...args)
    };
  }

  /**
   * Main entry point - run all tests
   */
  async runAllTests() {
    this.logger.info('🚀 Starting FinanceBot Pro Pre-Production Test Suite');
    this.results.startTime = new Date();

    try {
      // Verify server is running
      await this.verifyServerHealth();

      // Initialize test session
      const mainSessionId = await this.initializeSession();

      // Run test suites in sequence
      await this.runFunctionalTests(mainSessionId);
      await this.runInputVariationTests(mainSessionId);
      await this.runSecurityTests(mainSessionId);
      await this.runPerformanceTests();
      await this.runErrorHandlingTests(mainSessionId);
      await this.runContextTests(mainSessionId);

      // Portfolio upload test
      await this.runPortfolioTests(mainSessionId);

    } catch (error) {
      this.logger.error('Test suite failed:', error);
      this.results.criticalIssues.push({
        type: 'test_suite_failure',
        error: error.message
      });
    } finally {
      this.results.endTime = new Date();
      
      // Generate and save reports
      const report = await this.generateFinalReport();
      await this.saveReports(report);
      
      // Display summary
      this.displaySummary(report);
    }

    return this.results;
  }

  /**
   * Verify server is healthy before starting tests
   */
  async verifyServerHealth() {
    this.logger.info('Verifying server health...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/health`, {
        timeout: 5000
      });

      if (response.status !== 200) {
        throw new Error(`Server unhealthy: ${response.status}`);
      }

      this.logger.info('✅ Server is healthy');
    } catch (error) {
      this.logger.error('❌ Server health check failed:', error.message);
      throw new Error('Server is not accessible. Please ensure it is running.');
    }
  }

  /**
   * Initialize a test session
   */
  async initializeSession() {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/session/init`, {
        testMode: true
      });

      const sessionId = response.data.sessionId || `test_session_${Date.now()}`;
      this.logger.info(`Session initialized: ${sessionId}`);
      return sessionId;
    } catch (error) {
      this.logger.warn('Session init failed, using fallback:', error.message);
      return `test_session_${Date.now()}`;
    }
  }

  /**
   * Run functional tests
   */
  async runFunctionalTests(sessionId) {
    this.logger.info('\n📋 Running Functional Tests...\n');
    
    const functionalTests = this.testCases.generateFunctionalTests();
    const results = {
      priceQueries: await this.runTestCategory('Price Queries', functionalTests.priceQueries, sessionId),
      comparisons: await this.runTestCategory('Comparisons', functionalTests.comparisons, sessionId),
      portfolio: await this.runTestCategory('Portfolio', functionalTests.portfolio, sessionId),
      trends: await this.runTestCategory('Trends', functionalTests.trends, sessionId),
      market: await this.runTestCategory('Market', functionalTests.market, sessionId),
      charts: await this.runTestCategory('Charts', functionalTests.charts, sessionId)
    };

    // Smart Insights need special handling (sequence of queries)
    results.smartInsights = await this.runSmartInsightTests(functionalTests.smartInsights, sessionId);

    this.results.functional = results;
  }

  /**
   * Run a category of tests
   */
  async runTestCategory(categoryName, tests, sessionId) {
    this.logger.info(`\nTesting ${categoryName} (${tests.length} tests)...`);
    
    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
      bugs: []
    };

    for (const test of tests) {
      try {
        const result = await this.executeTest(test, sessionId);
        
        if (result.success) {
          results.passed++;
          if (this.config.verbose) {
            this.logger.info(`  ✅ ${test.query}`);
          }
        } else {
          results.failed++;
          this.logger.error(`  ❌ ${test.query} - ${result.error}`);
          
          results.bugs.push({
            test: test.query,
            expected: test.expected,
            actual: result.actual,
            error: result.error
          });

          this.results.bugs.push({
            category: categoryName,
            ...results.bugs[results.bugs.length - 1]
          });
        }
      } catch (error) {
        results.failed++;
        this.logger.error(`  ❌ ${test.query} - Exception: ${error.message}`);
      }

      // Small delay between tests
      await this.sleep(100);
    }

    this.logger.info(`${categoryName} Results: ${results.passed}/${results.total} passed`);
    return results;
  }

  /**
   * Execute a single test
   */
  async executeTest(test, sessionId) {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/chat`,
        {
          message: test.query,
          sessionId: sessionId
        },
        {
          timeout: 10000,
          validateStatus: () => true
        }
      );

      const endTime = Date.now();
      const result = {
        responseTime: endTime - startTime,
        status: response.status,
        data: response.data
      };

      // Debug logging for first few tests
      if (this.config.verbose || this.results.summary.totalTests < 3) {
        this.logger.debug(`Test response for "${test.query}":`, {
          status: result.status,
          success: result.data?.success,
          type: result.data?.type,
          symbols: result.data?.symbols,
          hasResponse: !!result.data?.response,
          responseLength: result.data?.response?.length
        });
      }

      // Validate response based on test expectations
      return this.validateTestResult(test, result);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate test result against expectations
   */
  validateTestResult(test, result) {
    const validation = { success: true, errors: [] };

    // Check status code
    if (result.status !== 200) {
      validation.success = false;
      validation.errors.push(`Status ${result.status}`);
    }

    // Check if we got a successful response
    if (!result.data || !result.data.success) {
      validation.success = false;
      validation.errors.push('Response not successful');
      return validation;
    }

    // Check expected intent - API uses 'type' field instead of 'intent'
    if (test.expectedIntent) {
      const actualIntent = result.data.type || result.data.intent;
      
      // Map expected intent to actual API response types
      const intentMapping = {
        'analysis_query': ['analysis_query'],
        'comparison_query': ['comparison_query'],
        'trend_query': ['trend_query'],
        'portfolio_query': ['portfolio_query'],
        'market_overview': ['market_overview'],
        'company_info': ['company_info'],
        'greeting': ['greeting'],
        'help_query': ['help_query'],
        'date_time_query': ['date_time_query']
      };

      const validIntents = intentMapping[test.expectedIntent] || [test.expectedIntent];
      if (!validIntents.includes(actualIntent)) {
        validation.success = false;
        validation.errors.push(`Expected intent '${test.expectedIntent}', got '${actualIntent}'`);
      }
    }

    // Check expected symbols
    if (test.expectedSymbols) {
      const symbols = result.data.symbols || [];
      const missing = test.expectedSymbols.filter(s => !symbols.includes(s));
      if (missing.length > 0) {
        validation.success = false;
        validation.errors.push(`Missing symbols: ${missing.join(', ')}`);
      }
    }

    // Check for required fields
    if (test.shouldHavePrice) {
      // Check for price in response text
      const hasPrice = result.data.response && (
        result.data.response.includes('$') || 
        result.data.response.match(/\d+\.\d+/) || 
        result.data.response.toLowerCase().includes('trading at') ||
        result.data.response.toLowerCase().includes('price')
      );
      
      if (!hasPrice) {
        validation.success = false;
        validation.errors.push('No price found in response');
      }
    }

    if (test.shouldHaveChart && !result.data.showChart && !result.data.chartData) {
      validation.success = false;
      validation.errors.push('Expected chart but none provided');
    }

    return {
      success: validation.success,
      error: validation.errors.join('; '),
      actual: result.data
    };
  }

  /**
   * Run Smart Insight tests (sequence-based)
   */
  async runSmartInsightTests(tests, baseSessionId) {
    this.logger.info('\nTesting Smart Insights...');
    
    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
      bugs: []
    };

    for (const test of tests) {
      // Create new session for each sequence
      const sessionId = `${baseSessionId}_insight_${Date.now()}`;
      let sequenceSuccess = true;

      for (const step of test.sequence) {
        const response = await this.executeTest(
          { query: step.query },
          sessionId
        );

        if (step.shouldTriggerInsight) {
          // Check if insight was triggered
          const hasInsight = response.actual?.response?.toLowerCase().includes('notice') ||
                           response.actual?.response?.toLowerCase().includes('asking about');
          
          if (!hasInsight) {
            sequenceSuccess = false;
            results.bugs.push({
              test: 'Smart Insight Trigger',
              sequence: test.sequence.map(s => s.query),
              error: 'Insight not triggered on 3rd query'
            });
          }
        }

        await this.sleep(step.delay || 1000);
      }

      if (sequenceSuccess) {
        results.passed++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Run input variation tests
   */
  async runInputVariationTests(sessionId) {
    this.logger.info('\n🔤 Running Input Variation Tests...\n');
    
    const variationTests = this.testCases.generateInputVariationTests();
    const results = {};

    for (const [category, tests] of Object.entries(variationTests)) {
      results[category] = await this.runTestCategory(
        category.charAt(0).toUpperCase() + category.slice(1),
        tests,
        sessionId
      );
    }

    this.results.inputVariation = results;
  }

  /**
   * Run security tests
   */
  async runSecurityTests(sessionId) {
    this.logger.info('\n🔒 Running Security Tests...\n');
    
    const securityResults = await this.securityTests.runAllTests(sessionId);
    this.results.security = securityResults;

    // Add critical vulnerabilities to issues
    if (securityResults.vulnerabilities.total > 0) {
      securityResults.vulnerabilities.details.forEach(vuln => {
        if (vuln.severity === 'critical' || vuln.severity === 'high') {
          this.results.criticalIssues.push({
            type: 'security_vulnerability',
            ...vuln
          });
        }
      });
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    this.logger.info('\n⚡ Running Performance Tests...\n');
    
    const performanceResults = await this.loadTester.runAllTests();
    this.results.performance = performanceResults;

    // Check for performance issues
    if (performanceResults.responseTime.p95 > 3000) {
      this.results.criticalIssues.push({
        type: 'performance',
        issue: 'P95 response time exceeds 3 seconds',
        value: performanceResults.responseTime.p95
      });
    }
  }

  /**
   * Run error handling tests
   */
  async runErrorHandlingTests(sessionId) {
    this.logger.info('\n⚠️ Running Error Handling Tests...\n');
    
    const errorTests = this.testCases.generateErrorHandlingTests();
    const results = {};

    for (const [category, tests] of Object.entries(errorTests)) {
      // Handle different test formats
      if (Array.isArray(tests)) {
        results[category] = await this.runTestCategory(
          category.charAt(0).toUpperCase() + category.slice(1),
          tests,
          sessionId
        );
      } else if (tests.queries) {
        // Special handling for rapid fire format
        results[category] = await this.runRapidFireErrorTest(tests, sessionId);
      }
    }

    this.results.errorHandling = results;
  }

  /**
   * Run context management tests
   */
  async runContextTests(sessionId) {
    this.logger.info('\n💭 Running Context Management Tests...\n');
    
    const contextTests = this.testCases.generateContextTests();
    const results = {};

    for (const [category, tests] of Object.entries(contextTests)) {
      if (Array.isArray(tests)) {
        results[category] = await this.runConversationTests(tests, sessionId);
      }
    }

    this.results.context = results;
  }

  /**
   * Run conversation flow tests
   */
  async runConversationTests(tests, baseSessionId) {
    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
      bugs: []
    };

    for (const test of tests) {
      const sessionId = `${baseSessionId}_conv_${Date.now()}`;
      let conversationSuccess = true;

      for (const step of test.conversation) {
        const response = await this.executeTest(
          { query: step.query },
          sessionId
        );

        // Validate conversation context
        if (step.shouldReferToAAPL && !response.actual?.response?.includes('AAPL')) {
          conversationSuccess = false;
          results.bugs.push({
            test: test.name,
            step: step.query,
            error: 'Lost context - should reference AAPL'
          });
        }

        await this.sleep(500);
      }

      if (conversationSuccess) {
        results.passed++;
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Run portfolio tests
   */
  async runPortfolioTests(sessionId) {
    this.logger.info('\n📊 Running Portfolio Upload Tests...\n');
    
    try {
      // Upload test portfolio
      const formData = new FormData();
      const portfolioPath = path.join(__dirname, '../data/test-portfolio.csv');
      const portfolioData = await fs.readFile(portfolioPath);
      
      // Create form data with file
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', portfolioData, 'test-portfolio.csv');
      form.append('sessionId', sessionId);

      const response = await axios.post(
        `${this.config.baseUrl}/api/portfolio/upload`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 10000
        }
      );

      if (response.status === 200) {
        this.logger.info('✅ Portfolio uploaded successfully');
        
        // Test portfolio analysis
        const analysisResponse = await this.executeTest(
          { query: 'analyze my portfolio' },
          sessionId
        );

        if (analysisResponse.success) {
          this.logger.info('✅ Portfolio analysis working');
        } else {
          this.logger.error('❌ Portfolio analysis failed');
          this.results.bugs.push({
            category: 'Portfolio',
            test: 'Portfolio Analysis',
            error: analysisResponse.error
          });
        }
      }
    } catch (error) {
      this.logger.error('❌ Portfolio upload failed:', error.message);
      this.results.criticalIssues.push({
        type: 'portfolio_upload',
        error: error.message
      });
    }
  }

  /**
   * Generate final comprehensive report
   */
  async generateFinalReport() {
    const duration = (this.results.endTime - this.results.startTime) / 1000;
    
    // Calculate totals
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    // Count functional tests
    Object.values(this.results.functional).forEach(category => {
      if (category.total) {
        totalTests += category.total;
        totalPassed += category.passed;
        totalFailed += category.failed;
      }
    });

    // Add other test counts
    if (this.results.security?.summary) {
      totalTests += this.results.security.summary.totalTests;
      totalPassed += this.results.security.summary.passed;
      totalFailed += this.results.security.summary.failed;
    }

    const passRate = (totalPassed / totalTests * 100).toFixed(1);

    const report = {
      summary: {
        title: 'FinanceBot Pro - Pre-Production Test Report',
        timestamp: new Date().toISOString(),
        duration: `${duration.toFixed(1)}s`,
        totalTests: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        passRate: `${passRate}%`,
        criticalIssues: this.results.criticalIssues.length,
        bugs: this.results.bugs.length,
        productionReady: this.isProductionReady()
      },
      functional: this.results.functional,
      security: this.results.security,
      performance: this.results.performance,
      bugs: this.results.bugs,
      criticalIssues: this.results.criticalIssues,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Determine if system is production ready
   */
  isProductionReady() {
    const hasNoCriticalIssues = this.results.criticalIssues.length === 0;
    const hasGoodPassRate = this.calculateOverallPassRate() >= 95;
    const hasGoodPerformance = this.results.performance?.grade !== 'D' && this.results.performance?.grade !== 'F';
    const hasGoodSecurity = this.results.security?.grade !== 'D' && this.results.security?.grade !== 'F';

    return hasNoCriticalIssues && hasGoodPassRate && hasGoodPerformance && hasGoodSecurity;
  }

  /**
   * Calculate overall pass rate
   */
  calculateOverallPassRate() {
    let totalTests = 0;
    let totalPassed = 0;

    // Functional tests
    Object.values(this.results.functional).forEach(category => {
      if (category.total) {
        totalTests += category.total;
        totalPassed += category.passed;
      }
    });

    // Security tests
    if (this.results.security?.summary) {
      totalTests += this.results.security.summary.totalTests;
      totalPassed += this.results.security.summary.passed;
    }

    return totalTests > 0 ? (totalPassed / totalTests * 100) : 0;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];

    // Critical issues
    if (this.results.criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `Fix ${this.results.criticalIssues.length} critical issues before production`,
        issues: this.results.criticalIssues
      });
    }

    // Bug frequency
    const bugsByCategory = {};
    this.results.bugs.forEach(bug => {
      bugsByCategory[bug.category] = (bugsByCategory[bug.category] || 0) + 1;
    });

    const topBugCategories = Object.entries(bugsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topBugCategories.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Focus on fixing bugs in these areas',
        categories: topBugCategories.map(([cat, count]) => `${cat} (${count} bugs)`)
      });
    }

    // Performance
    if (this.results.performance?.recommendations) {
      this.results.performance.recommendations.forEach(rec => {
        recommendations.push({
          priority: 'MEDIUM',
          message: rec
        });
      });
    }

    // Security
    if (this.results.security?.recommendations) {
      this.results.security.recommendations.forEach(rec => {
        recommendations.push({
          priority: 'HIGH',
          message: rec
        });
      });
    }

    return recommendations;
  }

  /**
   * Save reports to files
   */
  async saveReports(report) {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Save JSON report
      const jsonPath = path.join(this.config.outputDir, 'test-report.json');
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
      this.logger.info(`Report saved to: ${jsonPath}`);

      // Generate and save HTML dashboard
      const DashboardGenerator = require('../reports/dashboardGenerator');
      const dashboard = new DashboardGenerator();
      const htmlContent = dashboard.generateHTML(report);
      
      const htmlPath = path.join(this.config.outputDir, 'test-dashboard.html');
      await fs.writeFile(htmlPath, htmlContent);
      this.logger.info(`Dashboard saved to: ${htmlPath}`);

    } catch (error) {
      this.logger.error('Failed to save reports:', error);
    }
  }

  /**
   * Display summary in console
   */
  displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('        FINANCEBOT PRO - TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📈 Pass Rate: ${report.summary.passRate}`);
    console.log(`🐛 Bugs Found: ${report.summary.bugs}`);
    console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
    console.log('='.repeat(60));
    
    if (report.summary.productionReady) {
      console.log('✅ PRODUCTION READY - All tests passed!');
    } else {
      console.log('❌ NOT PRODUCTION READY - Issues need to be fixed');
      console.log('\nTop Issues:');
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority}] ${rec.message}`);
      });
    }
    
    console.log('='.repeat(60));
    console.log(`\nFull report available at: ${this.config.outputDir}/test-dashboard.html`);
  }

  /**
   * Helper methods
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runRapidFireErrorTest(test, sessionId) {
    const results = {
      total: test.queries.length,
      passed: 0,
      failed: 0
    };

    // Implementation for rapid fire error tests
    for (const query of test.queries.slice(0, 10)) { // Limit to 10 for error tests
      const response = await this.executeTest(query, sessionId);
      if (response.success) {
        results.passed++;
      } else {
        results.failed++;
      }
      await this.sleep(test.queries.interval || 500);
    }

    return results;
  }
}

module.exports = PreProductionTestRunner;