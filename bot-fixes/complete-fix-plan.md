# Complete Bot Fix Plan

## Critical Issues to Fix

### 1. Intent Classifier Not Blocking Non-Financial
Problem: Bot answers "teach me to make gluten free pizza" - should refuse
Fix: 
- Update server.js line ~1250 to CHECK intent classification BEFORE calling Perplexity
- If classification is 'non-financial', return polite refusal
- Add this check: if (classification.classification === 'non-financial') { return refusal message }

### 2. Wrong Bitcoin Price
Problem: Shows $111,289 but real price is ~$106,000
Fix:
- Check CoinGecko API response parsing in market-data-service.js
- Verify price field extraction is correct
- Add validation: prices should be reasonable (BTC between $20k-$200k)

### 3. Wrong Bitcoin Chart
Problem: Shows declining red chart but Bitcoin is rising
Fix:
- Chart data is not synced with actual price data
- Update chart generation to use real historical data
- Fix the trend calculation in server.js

### 4. Integration Issues
Problem: Intent classifier runs but doesn't block responses
Fix in server.js around line 1240-1260:
Add this code BEFORE calling Perplexity:
if (intentResult.classification === 'non-financial') {
    const refusal = responseFilter.filterResponse('', intentResult);
    return res.json({
        response: refusal.filteredResponse,
        intent: 'non-financial-blocked'
    });
}

### 5. Add Disclaimer Manager
Problem: No disclaimers shown on financial advice
Fix:
- Import disclaimer manager in server.js
- Add disclaimer to EVERY financial response
- Place at end of response

### 6. Fix Greeting Logic
Problem: "hi" gets pizza-making response
Fix:
- Check intent classification for greetings
- Return simple greeting for greeting classification

## Testing Requirements

### Create comprehensive-test.js:
1. Test "What's Intel stock price?" - Should return real price with disclaimer
2. Test "How to make pizza?" - Should refuse politely
3. Test "Bitcoin price" - Should show correct price (~$106k)
4. Test "hi" - Should return greeting, not financial content
5. Test "Should I invest in AAPL?" - Should refuse investment advice
6. Test portfolio upload - Should work correctly

### Validation Checklist:
- Non-financial queries are refused (100% blocked)
- Bitcoin price is accurate (within 5% of real price)
- Charts show correct trend direction
- All financial responses have disclaimers
- Greetings get greeting responses
- Investment advice is refused
- Portfolio upload works

## Implementation Steps

1. Fix intent classifier integration in server.js
2. Fix market data price parsing
3. Fix chart generation to use real data
4. Add disclaimer to all responses
5. Create comprehensive test suite
6. Run all tests with REAL queries
7. Verify each guardrail works
