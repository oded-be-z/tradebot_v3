# FinanceBot Pro Production Test Suite

## Overview
Comprehensive test suite designed to validate FinanceBot Pro for production deployment handling real money and investment decisions.

## Test Categories

### 1. Core Functionality (100 tests)
- **Price Queries**: 20 tests for stock/crypto price lookups
- **Trend Analysis**: 15 tests for chart generation
- **Comparisons**: 15 tests for multi-symbol comparisons
- **Portfolio Operations**: 20 tests for portfolio analysis
- **Investment Advice**: 30 tests for recommendations

### 2. Typo Resilience (50 tests)
- Common misspellings
- Missing/extra spaces
- Case variations
- Phonetic errors
- Autocorrect issues

### 3. Context Retention (30 tests)
- Basic symbol context
- Complex context switching
- Portfolio context
- Pronoun resolution
- Topic persistence

### 4. Guard Rails & Safety (40 tests)
- Banned phrase detection
- Response length limits
- Non-financial query handling
- Prompt injection resistance
- Data validation

### 5. Load & Performance (20 tests)
- Concurrent users
- Rapid-fire queries
- Mixed load patterns
- Memory leak detection

### 6. Edge Cases (30 tests)
- Empty/null inputs
- Very long inputs
- Special characters
- Unicode/emojis
- Multiple languages

### 7. Conversation Flow (20 tests)
- Natural investment discussions
- Portfolio management flows
- Market analysis conversations
- Educational dialogues
- Decision-making processes

## Running the Tests

### Prerequisites
```bash
# Ensure server is running
npm start

# Install test dependencies if needed
npm install axios form-data
```

### Execute Tests
```bash
# Run complete test suite
node test_production_suite.js

# Expected duration: 2-3 hours
```

### Monitor Progress
The test suite provides real-time progress updates:
```
🚀 STARTING FINANCEBOT PRO PRODUCTION TEST SUITE
==================================================
✅ Created test session: abc123...

📊 Running Core Functionality Tests...
  Progress: 10/100
  Progress: 20/100
  ...
✅ Core tests complete: 98/100 passed

🔤 Running Typo Resilience Tests...
✅ Typo tests complete: 49/50 passed

[continues for all categories...]
```

## Success Criteria

### Production Readiness Requirements:
- ✅ **99.5% overall pass rate**
- ✅ **Zero banned phrases** in responses
- ✅ **All context tests pass**
- ✅ **P99 response time < 5 seconds**
- ✅ **No memory leaks detected**
- ✅ **All critical paths verified**

## Output Files

### 1. PRODUCTION_TEST_REPORT.md
Human-readable report with:
- Executive summary
- Performance metrics
- Test results by category
- Critical failures
- Recommendations
- Production readiness checklist

### 2. PRODUCTION_TEST_RESULTS.json
Detailed JSON data including:
- All test results
- Performance metrics
- Violation details
- Failure reasons

## Interpreting Results

### Critical Failures
Any of these will prevent production deployment:
- Basic price queries failing
- Portfolio analysis errors
- Security vulnerabilities
- Context retention failures

### Performance Benchmarks
- Average response time: < 1000ms
- P95 response time: < 3000ms
- P99 response time: < 5000ms
- Max response time: < 5000ms

### Violation Types
1. **Banned Phrases**: "let me know", "feel free", etc.
2. **Length Violations**: Responses exceeding limits
3. **Context Failures**: Lost conversation context

## Fixing Common Issues

### High Response Times
- Check Azure OpenAI API latency
- Review database query optimization
- Verify server resources

### Banned Phrases
- Update system prompts in azureOpenAI.js
- Enhance enforceResponseBrevity() filters
- Add pre-generation validation

### Context Failures
- Review conversation state management
- Check session handling
- Verify symbol extraction logic

### Typo Resilience
- Enhance SafeSymbolExtractor
- Add more symbol mappings
- Improve fuzzy matching

## Test Data

The suite automatically creates `test_portfolio.csv` with sample holdings:
- Tech stocks: AAPL, MSFT, NVDA, GOOGL, AMZN, META
- Other stocks: TSLA, SPY
- Crypto: BTC, ETH

## Continuous Integration

For CI/CD pipelines:
```yaml
test:
  script:
    - npm start &
    - sleep 10
    - node test_production_suite.js
  artifacts:
    paths:
      - PRODUCTION_TEST_REPORT.md
      - PRODUCTION_TEST_RESULTS.json
```

## Emergency Contacts

If critical failures occur in production:
1. Check PRODUCTION_TEST_REPORT.md
2. Review server logs
3. Verify Azure OpenAI service status
4. Check market data API availability

## Version History

- v1.0: Initial comprehensive test suite
- Covers 290+ test scenarios
- Production-grade validation

---

Remember: This bot handles real money. Always run full test suite before deployment!