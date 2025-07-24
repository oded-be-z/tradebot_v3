#!/usr/bin/env node

/**
 * FinanceBot Pro - Comprehensive Pre-Production Test Suite
 * 
 * Usage:
 *   npm run test:production
 *   node run-all-tests.js
 *   node run-all-tests.js --verbose
 *   node run-all-tests.js --url http://staging.example.com
 *   node run-all-tests.js --output ./custom-reports
 */

const PreProductionTestRunner = require('./framework/testRunner');
const path = require('path');
const fs = require('fs').promises;

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     ███████╗██╗███╗   ██╗ █████╗ ███╗   ██╗ ██████╗███████╗     ║
║     ██╔════╝██║████╗  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝     ║
║     █████╗  ██║██╔██╗ ██║███████║██╔██╗ ██║██║     █████╗       ║
║     ██╔══╝  ██║██║╚██╗██║██╔══██║██║╚██╗██║██║     ██╔══╝       ║
║     ██║     ██║██║ ╚████║██║  ██║██║ ╚████║╚██████╗███████╗     ║
║     ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝     ║
║                                                                   ║
║              BOT PRO v4.0 - PRE-PRODUCTION TEST SUITE            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    baseUrl: 'http://localhost:3000',
    outputDir: './reports',
    verbose: false,
    parallel: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        config.help = true;
        break;
      case '--url':
      case '-u':
        config.baseUrl = args[++i];
        break;
      case '--output':
      case '-o':
        config.outputDir = args[++i];
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--parallel':
      case '-p':
        config.parallel = true;
        break;
    }
  }

  return config;
}

// Display help information
function showHelp() {
  console.log(`
Usage: node run-all-tests.js [options]

Options:
  -h, --help          Show this help message
  -u, --url <url>     Base URL to test (default: http://localhost:3000)
  -o, --output <dir>  Output directory for reports (default: ./reports)
  -v, --verbose       Enable verbose logging
  -p, --parallel      Run tests in parallel (experimental)

Examples:
  node run-all-tests.js
  node run-all-tests.js --url http://staging.financebot.com --verbose
  node run-all-tests.js --output ./test-results/2024-01-24
`);
}

// Check prerequisites
async function checkPrerequisites(config) {
  console.log(`${colors.cyan}Checking prerequisites...${colors.reset}`);
  
  const checks = {
    nodeVersion: false,
    serverConnection: false,
    testData: false,
    outputDirectory: false
  };

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 14) {
    checks.nodeVersion = true;
    console.log(`${colors.green}✓${colors.reset} Node.js version: ${nodeVersion}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Node.js version ${nodeVersion} is too old. Requires v14+`);
  }

  // Check server connection
  try {
    const axios = require('axios');
    const response = await axios.get(`${config.baseUrl}/api/health`, { timeout: 5000 });
    if (response.status === 200) {
      checks.serverConnection = true;
      console.log(`${colors.green}✓${colors.reset} Server is running at ${config.baseUrl}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Cannot connect to server at ${config.baseUrl}`);
    console.log(`  Please ensure the server is running: npm start`);
  }

  // Check test data exists
  try {
    await fs.access(path.join(__dirname, 'data/test-portfolio.csv'));
    checks.testData = true;
    console.log(`${colors.green}✓${colors.reset} Test data files found`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Test data files missing`);
  }

  // Create output directory
  try {
    await fs.mkdir(config.outputDir, { recursive: true });
    checks.outputDirectory = true;
    console.log(`${colors.green}✓${colors.reset} Output directory ready: ${config.outputDir}`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Cannot create output directory: ${error.message}`);
  }

  const allChecksPassed = Object.values(checks).every(check => check);
  return allChecksPassed;
}

// Display test configuration
function displayConfiguration(config) {
  console.log(`\n${colors.cyan}Test Configuration:${colors.reset}`);
  console.log(`  Target URL: ${colors.bright}${config.baseUrl}${colors.reset}`);
  console.log(`  Output Directory: ${colors.bright}${config.outputDir}${colors.reset}`);
  console.log(`  Verbose Mode: ${config.verbose ? colors.green + 'ON' : colors.yellow + 'OFF'}${colors.reset}`);
  console.log(`  Parallel Mode: ${config.parallel ? colors.green + 'ON' : colors.yellow + 'OFF'}${colors.reset}`);
}

// Progress indicator
class ProgressIndicator {
  constructor() {
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.interval = null;
  }

  start(message) {
    this.stop(); // Clear any existing interval
    this.interval = setInterval(() => {
      process.stdout.write(`\r${colors.cyan}${this.frames[this.currentFrame]}${colors.reset} ${message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r\x1b[K'); // Clear line
    }
  }
}

// Format duration
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

// Main test execution
async function runTests(config) {
  const startTime = Date.now();
  const progress = new ProgressIndicator();
  
  console.log(`\n${colors.bright}Starting Comprehensive Test Suite...${colors.reset}\n`);
  
  try {
    // Initialize test runner
    const runner = new PreProductionTestRunner(config);
    
    // Set up progress hooks
    if (!config.verbose) {
      const originalInfo = runner.logger.info;
      runner.logger.info = (message) => {
        progress.stop();
        console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
        if (message.includes('Running')) {
          progress.start(message.replace('Running', 'Processing'));
        }
      };
    }
    
    // Run all tests
    const results = await runner.runAllTests();
    progress.stop();
    
    // Calculate duration
    const duration = (Date.now() - startTime) / 1000;
    
    // Display results
    displayResults(results, duration);
    
    // Open dashboard if possible
    const dashboardPath = path.join(config.outputDir, 'test-dashboard.html');
    console.log(`\n${colors.bright}📊 Test Dashboard:${colors.reset} ${dashboardPath}`);
    
    // Try to open in browser
    const opener = require('opener');
    try {
      opener(dashboardPath);
      console.log(`${colors.green}✓${colors.reset} Dashboard opened in your browser`);
    } catch (e) {
      console.log(`${colors.yellow}!${colors.reset} Please open the dashboard manually`);
    }
    
    // Exit with appropriate code
    const exitCode = results.summary.productionReady ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    progress.stop();
    console.error(`\n${colors.red}Fatal Error:${colors.reset} ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

// Display test results summary
function displayResults(results, duration) {
  const summary = results.summary;
  
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}                    TEST EXECUTION COMPLETE${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
  
  // Test Statistics
  console.log(`${colors.cyan}Test Statistics:${colors.reset}`);
  console.log(`  Total Tests: ${colors.bright}${summary.totalTests}${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${summary.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${summary.failed}${colors.reset}`);
  console.log(`  Pass Rate: ${getPassRateColor(summary.passRate)}${summary.passRate}${colors.reset}`);
  console.log(`  Duration: ${colors.bright}${formatDuration(duration)}${colors.reset}`);
  
  // Critical Metrics
  console.log(`\n${colors.cyan}Critical Metrics:${colors.reset}`);
  console.log(`  ${colors.red}Critical Issues: ${summary.criticalIssues}${colors.reset}`);
  console.log(`  ${colors.yellow}Bugs Found: ${summary.bugs}${colors.reset}`);
  
  // Security Assessment
  if (results.security) {
    console.log(`\n${colors.cyan}Security Assessment:${colors.reset}`);
    console.log(`  Grade: ${getGradeColor(results.security.grade)}${results.security.grade}${colors.reset}`);
    if (results.security.vulnerabilities?.total > 0) {
      console.log(`  ${colors.red}Vulnerabilities: ${results.security.vulnerabilities.total}${colors.reset}`);
    }
  }
  
  // Performance Metrics
  if (results.performance) {
    console.log(`\n${colors.cyan}Performance Metrics:${colors.reset}`);
    console.log(`  Grade: ${getGradeColor(results.performance.grade)}${results.performance.grade}${colors.reset}`);
    console.log(`  P95 Response Time: ${colors.bright}${results.performance.responseTime.p95}ms${colors.reset}`);
    console.log(`  Throughput: ${colors.bright}${results.performance.summary.throughput}${colors.reset}`);
  }
  
  // Production Readiness
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  if (summary.productionReady) {
    console.log(`${colors.green}${colors.bright}✅ PRODUCTION READY${colors.reset}`);
    console.log(`${colors.green}All critical checks passed. System is ready for deployment.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ NOT PRODUCTION READY${colors.reset}`);
    console.log(`${colors.red}Critical issues must be resolved before deployment.${colors.reset}`);
    
    // Show top recommendations
    if (results.recommendations && results.recommendations.length > 0) {
      console.log(`\n${colors.yellow}Top Recommendations:${colors.reset}`);
      results.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.message}`);
      });
    }
  }
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);
}

// Helper functions for color coding
function getPassRateColor(passRate) {
  const rate = parseFloat(passRate);
  if (rate >= 95) return colors.green;
  if (rate >= 80) return colors.yellow;
  return colors.red;
}

function getGradeColor(grade) {
  if (!grade) return colors.reset;
  if (grade.startsWith('A')) return colors.green;
  if (grade.startsWith('B')) return colors.blue;
  if (grade.startsWith('C')) return colors.yellow;
  return colors.red;
}

// Main entry point
async function main() {
  console.clear();
  console.log(colors.cyan + banner + colors.reset);
  
  const config = parseArgs();
  
  if (config.help) {
    showHelp();
    process.exit(0);
  }
  
  displayConfiguration(config);
  
  // Check prerequisites
  console.log('');
  const ready = await checkPrerequisites(config);
  
  if (!ready) {
    console.log(`\n${colors.red}Prerequisites not met. Please fix the issues above and try again.${colors.reset}`);
    process.exit(1);
  }
  
  // Confirm before starting
  console.log(`\n${colors.yellow}This test suite will:`);
  console.log('  • Execute 500+ comprehensive tests');
  console.log('  • Test all API endpoints with real data');
  console.log('  • Perform security vulnerability scans');
  console.log('  • Stress test with concurrent users');
  console.log('  • Generate detailed reports and dashboard');
  console.log(`${colors.reset}`);
  
  // Add warning for production URLs
  if (!config.baseUrl.includes('localhost')) {
    console.log(`${colors.red}${colors.bright}⚠️  WARNING: Testing against non-localhost URL!${colors.reset}`);
    console.log(`${colors.red}This may affect production systems.${colors.reset}\n`);
  }

  console.log(`${colors.cyan}Note: The test suite has been updated to match your API's response format.${colors.reset}`);
  console.log(`${colors.cyan}- API returns 'type' field (e.g., 'analysis_query')${colors.reset}`);
  console.log(`${colors.cyan}- Price queries return 'analysis_query' type${colors.reset}\n`);
  
  // Start tests
  await runTests(config);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}Unhandled Error:${colors.reset}`, error);
  process.exit(2);
});

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Test suite interrupted by user${colors.reset}`);
  process.exit(130);
});

// Check if opener is installed, if not, skip browser opening
try {
  require('opener');
} catch (e) {
  // Opener not installed, that's okay
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(2);
  });
}

module.exports = { main };