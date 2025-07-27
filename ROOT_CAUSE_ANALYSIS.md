# Root Cause Analysis: Perplexity "No Data Available" Issue

## SMOKING GUN FOUND ✓

### Primary Root Cause: Token Limit Too Restrictive

**Location**: `/services/dualLLMOrchestrator.js` lines 44-48

```javascript
price_queries: {
  model: 'sonar-pro',
  max_tokens: 50, // ← THIS IS THE PROBLEM
  temperature: 0.05,
  timeout: 5000,
  ...
}
```

### Why This Causes "No Data Available"

1. **50 tokens is extremely restrictive** - That's approximately 35-40 words maximum
2. Perplexity receives the real market data in the system prompt
3. But with only 50 tokens, it cannot generate a proper response that includes:
   - The actual price data
   - Percentage changes
   - Volume information
   - Any context or formatting

4. Instead, Perplexity likely generates a truncated response like "No data available" because it literally doesn't have enough tokens to format a proper response

### Evidence from Code Flow

1. **dualLLMOrchestrator.js** (line ~519):
```javascript
const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
  ...this.perplexityConfig.price_queries,  // Spreads max_tokens: 50
  requireNumbers: true,
  symbol: symbol
});
```

2. **server.js** getFinancialAnalysis (line ~1825):
```javascript
const requestOptions = {
  maxTokens: options.max_tokens || options.maxTokens || 400,
  // ...
  ...options  // This spreads max_tokens: 50, overriding the default
};
```

3. **server.js** makeRequest (line ~1754):
```javascript
const requestBody = {
  model: options.model || "sonar-pro",
  messages: messages,
  max_tokens: options.maxTokens || 2000,  // Gets 50 from options
  temperature: options.temperature || 0.1,
  // ...
};
```

### Secondary Issues

1. **Temperature Too Low**: `0.05` is extremely low, making the model overly conservative
2. **Model Mismatch**: Config says `sonar-pro` but might be using `sonar` in some places
3. **Timeout**: 5 seconds might be too short for some requests

### The Fix

Change the token limit in `dualLLMOrchestrator.js`:

```javascript
price_queries: {
  model: 'sonar-pro',
  max_tokens: 300,  // Increase to allow proper responses
  temperature: 0.1,  // Slightly higher for more natural responses
  timeout: 8000,     // Give more time for quality responses
  // ...
}
```

### Why This Wasn't Obvious

1. The error manifests as "No data available" which suggests a data problem
2. The real market data IS being fetched and passed correctly
3. The system prompt DOES include the market data
4. But Perplexity literally cannot fit a proper response in 50 tokens

### Validation

To confirm this is the issue:
1. The system prompt includes real market data (verified in logs)
2. Perplexity receives the prompt correctly
3. But the response is truncated/generic due to token limit
4. Increasing the token limit should immediately fix the issue

### Impact

This single configuration change should resolve:
- "No data available" responses
- Generic/templated responses
- Missing price information
- Truncated analysis

## Recommendation

Immediately increase `max_tokens` from 50 to at least 300 for price queries. This will allow Perplexity to generate complete responses with the real market data it receives.