# Comprehensive FinanceBot Test Suite

## Overview
This test suite runs 200+ real API tests across 7 categories to validate the entire system end-to-end.

## Test Categories

### 1. Basic Market Queries (50 tests)
Tests fundamental stock price lookups and variations:
- Direct queries: "AAPL price", "MSFT stock", "TSLA?"
- Natural language: "how's apple doing?", "what's Microsoft at?"
- Chart requests: "show me NVDA", "display TSLA trend"
- Crypto: "BTC price", "bitcoin?"
- Indices: "SPY", "QQQ status"
- Commodities: "gold price", "oil update"

**Success Criteria**: 90%+ pass rate, <2s average response time

### 2. Conversational NLP (30 tests)
Tests natural language understanding:
- Casual crypto: "bitcoin?", "what's up with crypto?"
- Market overview: "is the market up today?"
- Sector queries: "tell me about tech stocks"
- Advice handling: "should I buy gold?"
- Trending: "what's hot today?"

**Success Criteria**: 80%+ conversational responses, no technical errors

### 3. Context & Follow-ups (20 tests)
Tests conversation memory and context retention:
- Sequential queries: "AAPL price" → "what about Microsoft?" → "compare them"
- Pronoun resolution: "MSFT analysis" → "what's its market cap?"
- Context switching: "tech stocks" → "focus on AAPL" → "compare to SPY"

**Success Criteria**: 70%+ maintain context correctly

### 4. Complex Analysis (20 tests)
Tests multi-symbol and portfolio features:
- Comparisons: "compare AAPL, MSFT, and GOOGL"
- Portfolio: "analyze: 100 AAPL, 50 TSLA, 200 MSFT"
- Performance: "best tech stock this month?"
- Themes: "AI stocks", "defensive plays"

**Success Criteria**: 70%+ handle complexity properly

### 5. Long Conversations (10 sessions)
Tests sustained conversation quality:
- 10-12 message conversations
- Topic deep dives
- Context retention over time
- Natural flow maintenance

**Success Criteria**: 80%+ conversations stay coherent

### 6. Error Cases (20 tests)
Tests graceful error handling:
- Invalid symbols: "FAKESYMBOL price"
- Weird input: "]][[", emojis, injections
- Edge cases: very long input, empty queries

**Success Criteria**: 100% graceful handling, no crashes

### 7. Performance Tests (100 queries)
Tests system under load:
- 100 rapid queries in batches
- Concurrent requests
- Response time distribution
- Cache effectiveness

**Success Criteria**: 
- 50%+ under 1s
- 90%+ under 3s
- 99%+ under 5s

## Expected Output Format

```
=== COMPREHENSIVE TEST RESULTS ===
Total Tests: 200
Passed: 164 (82.0%)
Failed: 36 (18.0%)

By Category:
Basic Queries: 45/50 (90.0%) - Avg: 1823ms
NLP Understanding: 22/30 (73.3%) - Avg: 2156ms
Context Retention: 14/20 (70.0%) - Avg: 2344ms
Complex Analysis: 15/20 (75.0%) - Avg: 3122ms
Long Conversations: 8/10 (80.0%) - Avg: 2511ms
Error Handling: 20/20 (100.0%) - Avg: 982ms

Top Failures:
[nlpConversational] "should I buy gold?" - Response not conversational
[contextFollowup] "Conv 2, Q3: compare them" - Lost context
[basicMarket] "oil price" - Technical error message
...

Performance:
Under 1s: 23.5%
1-3s: 52.3%
3-5s: 19.8%
Over 5s: 4.4%
Average response time: 2234ms

Recommendations:
- NLP understanding needs work - not handling natural language well
- Context retention is poor - losing track of conversation state
- Performance issues - over 20% of requests take more than 3 seconds
```

## Key Metrics Tracked

1. **Response Quality**
   - Is response conversational?
   - No "[object Object]" errors
   - No technical error messages
   - Proper symbol extraction

2. **Context Management**
   - Maintains conversation flow
   - Remembers previous queries
   - Handles pronouns correctly

3. **Performance**
   - Response time distribution
   - Timeout rates
   - Concurrent request handling

4. **Error Handling**
   - Graceful degradation
   - User-friendly messages
   - No crashes or hangs

## Running the Tests

```bash
# Start server first
npm start

# In another terminal
node test_comprehensive_suite.js

# Or use the automated script
./run_comprehensive_test.sh
```

## Success Criteria

- **EXCELLENT** (90%+): Production ready
- **GOOD** (80-89%): Works but needs fixes
- **FAIR** (70-79%): Has issues needing attention
- **POOR** (<70%): Not production ready

The test suite provides real, actionable data about system performance and identifies specific areas needing improvement.