# MANUAL VERIFICATION CHECKLIST - FinanceBot Pro

## Pre-Test Setup
- [ ] Server running on http://localhost:3000
- [ ] All environment variables configured (Azure OpenAI keys)
- [ ] Browser console open for error monitoring
- [ ] Network tab open to monitor API calls

## 1. CONVERSATION FLOW TESTS

### Test 1.1: Basic Context Retention
```
You: bitcoin
Bot: [Should show BTC analysis]
You: ethereum  
Bot: [Should show ETH analysis]
You: compare them
Bot: [Should show BTC vs ETH comparison - CRITICAL TEST]
```
- [ ] Bot remembers "them" refers to BTC and ETH
- [ ] Comparison table shows both cryptocurrencies
- [ ] No errors in console

### Test 1.2: Extended Context
```
You: Tell me about Apple
Bot: [Should show AAPL analysis]
You: What about Microsoft?
Bot: [Should show MSFT analysis]  
You: Which has better fundamentals?
Bot: [Should compare AAPL vs MSFT fundamentals]
You: Show me their 1-year trends
Bot: [Should show charts for both AAPL and MSFT]
```
- [ ] Context maintained across 4+ turns
- [ ] Pronouns correctly resolved
- [ ] Charts render for both stocks

### Test 1.3: Topic Switching
```
You: NVDA
Bot: [Shows NVDA analysis]
You: what is inflation?
Bot: [Shows educational content about inflation]
You: back to NVDA - is it overvalued?
Bot: [Returns to NVDA context with valuation analysis]
```
- [ ] Smooth topic transitions
- [ ] Context not lost when switching topics
- [ ] Educational content not blocked

## 2. COMPLEX QUERY TESTS

### Test 2.1: Multi-faceted Questions
- [ ] "Is Apple overvalued compared to its peers?" - Shows AAPL analysis with peer comparison
- [ ] "How has inflation affected tech stocks?" - Educational + market analysis combined
- [ ] "What's the correlation between oil prices and energy stocks?" - Shows relationship analysis
- [ ] "Should I buy TSLA given the current EV market?" - Investment insight without being advice

### Test 2.2: Natural Language Variations
- [ ] "how's apple doing?" → AAPL analysis
- [ ] "tesla news" → TSLA recent updates
- [ ] "is crypto dead?" → Crypto market analysis
- [ ] "market crashed?" → Market overview with context

### Test 2.3: Ambiguous Queries
- [ ] "show me the big tech companies" → FAANG or similar group
- [ ] "best performing sectors" → Sector analysis
- [ ] "safe investments" → Educational content about investment types
- [ ] "recession coming?" → Economic analysis

## 3. UI/UX VERIFICATION

### Test 3.1: Visual Elements
- [ ] Charts render properly with correct data
- [ ] No chart rendering errors in console
- [ ] Chart animations smooth
- [ ] Legend and tooltips work
- [ ] Responsive on different screen sizes

### Test 3.2: Response Formatting
- [ ] No response truncation (check long responses)
- [ ] Markdown formatting renders correctly
- [ ] Tables display properly
- [ ] Numbers formatted consistently
- [ ] Percentage changes color-coded (green/red)

### Test 3.3: Loading States
- [ ] Loading indicator appears immediately
- [ ] No UI freezing during requests
- [ ] Error messages helpful and user-friendly
- [ ] No double-sending of messages
- [ ] Smooth scrolling to new messages

### Test 3.4: Session Management
- [ ] Refresh page - session persists
- [ ] Open in new tab - new session created
- [ ] No session conflicts
- [ ] History properly maintained

## 4. LLM INTELLIGENCE TESTS

### Test 4.1: Company Information
- [ ] "who is the CEO of Apple?" → Shows Tim Cook + AAPL data
- [ ] "when was Google founded?" → Shows 1998 + GOOGL data
- [ ] "Microsoft headquarters?" → Shows Redmond + MSFT data
- [ ] "Tesla's main products?" → Company info + TSLA data

### Test 4.2: Financial Education
- [ ] "what is a P/E ratio?" → Educational explanation
- [ ] "how do options work?" → Options education
- [ ] "explain market cap" → Market cap explanation
- [ ] "what causes inflation?" → Economic education

### Test 4.3: Market Timing
- [ ] "is the market open?" → Current market status
- [ ] "market hours?" → Trading hours info
- [ ] "when does pre-market start?" → Pre-market timing
- [ ] "NYSE holidays?" → Market calendar info

### Test 4.4: Edge Cases Working
- [ ] "Apple news" → AAPL news (not blocked)
- [ ] "inflation impact" → Financial education (not blocked)
- [ ] "market analysis" → Market overview (not blocked)
- [ ] "CEO changes" → Company news context

## 5. SECURITY & ERROR HANDLING

### Test 5.1: Input Validation
- [ ] Very long input (1000+ chars) → Graceful handling
- [ ] Special characters → Properly escaped
- [ ] Empty input → Appropriate error
- [ ] Rapid submissions → Rate limiting works

### Test 5.2: Injection Attempts
- [ ] SQL injection attempts → Blocked/escaped
- [ ] XSS attempts → Sanitized
- [ ] Command injection → No execution
- [ ] Path traversal → No file access

### Test 5.3: API Errors
- [ ] Invalid stock symbol → Helpful error message
- [ ] Network timeout → Retry or graceful failure
- [ ] API rate limit → User-friendly message
- [ ] Server error → No sensitive info exposed

## 6. PERFORMANCE CHECKS

### Test 6.1: Response Times
- [ ] Simple query (AAPL) → Under 2 seconds
- [ ] Comparison query → Under 3 seconds
- [ ] Group analysis → Under 4 seconds
- [ ] Educational query → Under 2 seconds

### Test 6.2: Concurrent Usage
- [ ] Open 3 tabs → All work independently
- [ ] Rapid queries → No blocking
- [ ] Multiple users → No session mixing
- [ ] Heavy load → Graceful degradation

### Test 6.3: Resource Usage
- [ ] No memory leaks (monitor over time)
- [ ] Browser remains responsive
- [ ] No excessive API calls
- [ ] Charts don't accumulate in memory

## 7. DEBUG MODE VERIFICATION

### Test 7.1: Debug Features
- [ ] Add ?debug=true to URL
- [ ] Debug overlay appears
- [ ] Response metrics shown
- [ ] API call details visible
- [ ] Performance timing displayed

### Test 7.2: Console Checks
- [ ] No errors in console during normal use
- [ ] Warnings are meaningful
- [ ] Debug logs provide useful info
- [ ] No sensitive data in logs

## 8. PRODUCTION READINESS

### Test 8.1: Configuration
- [ ] Environment variables not exposed
- [ ] API keys secure
- [ ] CORS properly configured
- [ ] HTTPS ready (if applicable)

### Test 8.2: Monitoring
- [ ] Health endpoint works (/health)
- [ ] Metrics endpoint available
- [ ] Logging comprehensive
- [ ] Error tracking configured

### Test 8.3: Documentation
- [ ] API documentation complete
- [ ] Deployment guide ready
- [ ] Troubleshooting guide available
- [ ] Architecture documented

## FINAL SIGN-OFF

### Critical Features Working
- [ ] LLM-first pipeline operational
- [ ] Context awareness perfect
- [ ] Company/education queries answered
- [ ] Non-financial queries blocked
- [ ] Performance acceptable
- [ ] No security vulnerabilities

### Ready for Production?
- [ ] All automated tests pass (>95%)
- [ ] All manual tests pass
- [ ] Load testing successful
- [ ] No critical bugs
- [ ] Documentation complete
- [ ] Team sign-off obtained

---

## Test Results Summary

Date: _______________
Tester: _____________

**Overall Result**: [ ] PASS / [ ] FAIL

**Critical Issues Found**:
1. _________________________________
2. _________________________________
3. _________________________________

**Notes**:
_____________________________________
_____________________________________
_____________________________________

**Sign-off**: _______________________