# FinanceBot Pro Pre-Production Test Suite

## Overview

This comprehensive test suite validates FinanceBot Pro v4.0 for production readiness with 500+ automated tests covering:

- **Functional Testing**: All API endpoints and features
- **Security Testing**: Prompt injections, XSS, SQL injection, etc.
- **Performance Testing**: Load, concurrency, and stress tests
- **Input Variations**: Typos, slang, edge cases
- **Context Management**: Conversation memory and coherence
- **Portfolio Analysis**: CSV upload and analysis

## Quick Start

```bash
# From the project root directory
npm run test:production

# Or run directly
node pre-production-tests/run-all-tests.js

# With options
node pre-production-tests/run-all-tests.js --verbose --url http://staging.example.com
```

## Command Line Options

- `--help, -h`: Show help message
- `--url, -u <url>`: Base URL to test (default: http://localhost:3000)
- `--output, -o <dir>`: Output directory for reports (default: ./reports)
- `--verbose, -v`: Enable verbose logging
- `--parallel, -p`: Run tests in parallel (experimental)

## Test Categories

### 1. Functional Tests (200+ tests)
- Price queries with various formats
- Stock comparisons
- Portfolio analysis
- Trend analysis
- Market overviews
- Chart generation
- Smart insights

### 2. Input Variation Tests (100+ tests)
- Common typos (e.g., "mircosoft", "aapl")
- Slang terms ("stonks", "tendies", "moon")
- Mixed case ("AaPl PrIcE")
- Special characters
- Multiple languages
- Emoji usage
- Edge cases

### 3. Security Tests (50+ tests)
- Prompt injection attempts
- Jailbreak attempts
- Data exfiltration tests
- Malicious symbols
- XSS attempts
- SQL injection
- Path traversal
- Session hijacking
- Rate limit bypass
- Content filtering

### 4. Performance Tests (50+ tests)
- Rapid fire queries (100 sequential requests)
- Concurrent users (10+ simultaneous sessions)
- Sustained load (1 minute continuous)
- Burst traffic simulation
- Context window stress (50+ messages)
- Large payload handling
- Mixed workload patterns

### 5. Error Handling Tests (73+ tests)
- Invalid symbols
- Network errors
- Timeout scenarios
- Malformed requests
- Empty inputs
- Oversized inputs
- Rate limit handling

### 6. Context Management Tests (50+ tests)
- Multi-turn conversations
- Context switching
- Long conversations
- Topic continuity
- Reference handling

## Output Files

The test suite generates:

1. **test-report.json**: Detailed JSON report with all test results
2. **test-dashboard.html**: Interactive visual dashboard with:
   - Executive summary
   - Test results by category
   - Security assessment
   - Performance metrics
   - Bug heatmap
   - Critical issues
   - Recommendations

## Dashboard Features

The HTML dashboard includes:
- **Production Readiness Status**: Clear GO/NO-GO decision
- **Visual Charts**: Using Chart.js for metrics visualization
- **Bug Analysis**: Heatmap showing problem areas
- **Performance Graphs**: Response time distributions
- **Security Grade**: A+ to F rating
- **Actionable Recommendations**: Prioritized fixes

## Test Data

- **test-portfolio.csv**: Sample portfolio with 25 stocks
- **typos.json**: Common typo patterns
- **slang.json**: Financial slang terms

## Production Readiness Criteria

The system is considered production-ready when:
- ✅ No critical issues found
- ✅ 95%+ test pass rate
- ✅ Security grade C or better
- ✅ Performance grade C or better
- ✅ Error rate < 5%

## Interpreting Results

### Grades
- **A+/A**: Excellent, production-ready
- **B+/B**: Good, minor improvements recommended
- **C+/C**: Acceptable, some issues to address
- **D**: Poor, significant work needed
- **F**: Failing, critical issues blocking deployment

### Critical Issues
Any of these will block production:
- Security vulnerabilities (critical/high)
- P95 response time > 3 seconds
- Core functionality failures
- Data corruption risks

## Development Workflow

1. **Before Major Changes**:
   ```bash
   npm run test:production
   ```

2. **During Development**:
   ```bash
   # Test specific categories
   node pre-production-tests/run-all-tests.js --verbose
   ```

3. **Pre-Deployment**:
   ```bash
   # Full test against staging
   npm run test:production -- --url https://staging.financebot.com
   ```

## Troubleshooting

### Server Not Running
```
✗ Cannot connect to server at http://localhost:3000
```
**Solution**: Start the server with `npm start`

### Test Data Missing
```
✗ Test data files missing
```
**Solution**: Ensure all files in `pre-production-tests/data/` are present

### Permission Errors
```
✗ Cannot create output directory
```
**Solution**: Check write permissions for the reports directory

## Architecture

```
pre-production-tests/
├── framework/
│   ├── testCases.js         # Test case generator (523+ tests)
│   ├── securityTests.js     # Security testing module
│   ├── loadTester.js        # Performance testing
│   ├── testRunner.js        # Main orchestrator
│   └── resultAnalyzer.js    # Result analysis
├── reports/
│   └── dashboardGenerator.js # HTML dashboard creator
├── data/
│   ├── test-portfolio.csv   # Sample portfolio
│   ├── typos.json          # Typo patterns
│   └── slang.json          # Slang terms
└── run-all-tests.js        # Entry point
```

## Contributing

When adding new tests:
1. Add test cases to appropriate category in `testCases.js`
2. Update test counts in this README
3. Ensure new tests follow existing patterns
4. Test the test suite itself before committing

## License

Part of FinanceBot Pro v4.0 - MIT License