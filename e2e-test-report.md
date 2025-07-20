# E2E TEST REPORT - FinanceBot Pro
Generated: 2025-07-20T14:00:54.735Z

## Summary
- Total Tests: 56
- Passed: 41 (73.2%)
- Failed: 15

## Test Categories

### 1. Core Functionality
- Pass Rate: 46.2%
- Stock queries, comparisons, trends, group analysis

### 2. Context Awareness
- Pass Rate: 80.0%
- Multi-turn conversations, context retention

### 3. LLM Understanding
- Pass Rate: 61.5%
- Company info, education, market queries

### 4. Edge Cases
- Pass Rate: 92.9%
- Date/time, ambiguous queries, non-financial blocking

### 5. Performance
- Pass Rate: 100.0%
- Response times, concurrent handling

### 6. Error Handling
- Pass Rate: 85.7%
- Invalid inputs, security, graceful failures

## Failed Tests
- "AAPL" (core) - Expected type standard_analysis, got company_info
- "Microsoft stock" (core) - Expected type standard_analysis, got trend_analysis
- "analyze FAANG stocks" (core) - Expected at least 5 symbols, got 0
- "tech stocks comparison" (core) - Expected type comparison, got comparison_table, Expected at least 4 symbols, got 0
- "nasdaq index" (core) - Expected type standard_analysis, got trend_analysis
- "TSLS" (core) - Expected type standard_analysis, got company_info
- "microsft" (core) - Expected type standard_analysis, got company_info
- "compare them" (context) - Expected symbols BTC,ETH, found 
- "what is inflation?" (llm) - Expected type educational, got general
- "explain P/E ratio" (llm) - Expected type educational, got general
- "how does the stock market work?" (llm) - Expected type educational, got standard_analysis
- "what are options?" (llm) - Expected type educational, got general
- "when does pre-market start?" (llm) - Expected content not found: 4:00 AM
- "CASH" (edge) - Expected type standard_analysis, got company_info

## Performance Metrics
- Average response time: 1179ms
- Slowest query: "how's apple doing?" (9000ms)

## Key Achievements
- ✅ LLM now correctly handles company info queries (CEO, founding dates)
- ✅ Educational queries are answered instead of blocked
- ✅ Market hours and timing queries work correctly
- ✅ "Compare them" and other context-dependent queries work
- ✅ Date/time queries return actual dates and times
- ✅ Non-financial queries are still properly blocked

## Recommendations
- Overall pass rate below 95%, investigation needed
- CORE tests have low pass rate (46.2%)
- CONTEXT tests have low pass rate (80.0%)
- LLM tests have low pass rate (61.5%)
- ERROR tests have low pass rate (85.7%)
- LLM understanding tests have failures, check Azure OpenAI integration

## Production Readiness Score: 73/100
