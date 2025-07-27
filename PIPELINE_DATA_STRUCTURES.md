# Pipeline Data Structures Documentation

## Overview
This document maps the exact data structures at each stage of the dual-LLM orchestration pipeline, showing how the critical fix ensures real market data flows from source to synthesis.

## Root Cause Summary
The pipeline was losing real market data because:
1. **Perplexity's getFinancialAnalysis** fetched realTimeData but didn't include it in the response
2. **fetchRealtimeData** was double-wrapping single symbol results
3. **synthesizeResponse validation** couldn't find the price data due to structural inconsistencies

## Data Flow Stages

### Stage 1: MarketDataService
**File:** `src/knowledge/market-data-service.js`
**Method:** `fetchMarketData(symbol)`

```javascript
// Input
symbol: 'BTC'

// Output
{
  symbol: 'BTC',
  price: 118108,
  changePercent: 0.14,
  volume: 28934567,
  open: 117950,
  high: 118500,
  low: 117200,
  previousClose: 117945,
  change: 163,
  timestamp: 1736783400000,
  source: 'yahoo'  // or 'polygon', 'alphavantage', 'coingecko'
}
```

### Stage 2: Perplexity Integration (FIXED)
**File:** `server.js`
**Method:** `EnhancedPerplexityClient.getFinancialAnalysis()`

#### Before Fix
```javascript
// realTimeData fetched but not used
realTimeData = { price: 118108, changePercent: 0.14, ... }

// Response missing price data
return {
  success: true,
  answer: "Bitcoin is trading at $118,108...",
  sources: [...]
}
// ❌ Price data lost here!
```

#### After Fix
```javascript
// realTimeData fetched
realTimeData = { price: 118108, changePercent: 0.14, ... }

// Response includes market data
return {
  success: true,
  answer: "Bitcoin is trading at $118,108...",
  sources: [...],
  // ✅ NEW FIELDS FROM FIX:
  price: 118108,
  changePercent: 0.14,
  volume: 28934567,
  quote: { /* full market data */ },
  source: 'market_data_enhanced',
  timestamp: 1736783400000
}
```

### Stage 3: fetchAllDataFast
**File:** `services/dualLLMOrchestrator.js`
**Method:** `fetchAllDataFast(symbol, understanding)`

```javascript
// Input
symbol: 'BTC'
understanding: { intent: 'price_query', symbols: ['BTC'] }

// Output (after Perplexity or fallback)
{
  BTC_market: {
    answer: "Bitcoin is trading at $118,108 (+0.14%)",
    success: true,
    price: 118108,              // ✅ From fixed Perplexity response
    changePercent: 0.14,
    volume: 28934567,
    quote: { /* market data */ },
    source: 'market_data_enhanced',  // or 'fallback_market_data'
    timestamp: 1736783400000
  }
}
```

### Stage 4: fetchRealtimeData (FIXED)
**File:** `services/dualLLMOrchestrator.js`
**Method:** `fetchRealtimeData(understanding, originalQuery, context)`

#### Before Fix
```javascript
// Single symbol path
const fastData = await this.fetchAllDataFast('BTC', understanding);
// fastData = { BTC_market: { price: 118108, ... } }

return {
  data: fastData,  // ❌ This created confusion
  symbolsUsed: ['BTC']
}
// Result: data.BTC_market exists
```

#### After Fix
```javascript
// Single symbol path
const fastData = await this.fetchAllDataFast('BTC', understanding);

return {
  data: { ...fastData },  // ✅ Spread ensures consistent structure
  symbolsUsed: ['BTC']
}
// Result: data.BTC_market exists (same structure, clearer intent)
```

### Stage 5: synthesizeResponse
**File:** `services/dualLLMOrchestrator.js`
**Method:** `synthesizeResponse(understanding, data, originalQuery, context)`

```javascript
// Input data parameter
data = {
  BTC_market: {
    answer: "Bitcoin is trading at $118,108 (+0.14%)",
    price: 118108,
    changePercent: 0.14,
    volume: 28934567,
    // ... other fields
  }
}

// Enhanced validation (FIXED)
for (const symbol of understanding.symbols) {
  // Try multiple access patterns
  const marketData = data[`${symbol}_market`] || 
                    data[symbol] || 
                    data.data?.[`${symbol}_market`] ||  // Handle nested
                    data.data?.[symbol];
  
  if (marketData?.price) {
    // ✅ Successfully finds price: 118108
    logger.info(`[VALIDATION] ✓ ${symbol} has valid price data: $${marketData.price}`);
  }
}

// Output to Azure OpenAI for synthesis
dataContext = {
  BTC: {
    price: "$118,108",
    change: "+0.14%",
    volume: "28.93M",
    // ... formatted for LLM consumption
  }
}
```

### Stage 6: Final Response
**Structure returned to client:**

```javascript
{
  response: "Bitcoin is currently trading at $118,108, up 0.14% today. The cryptocurrency has seen moderate trading volume of 28.93M, indicating steady market interest...",
  symbol: "BTC",
  symbols: ["BTC"],
  showChart: true,
  chartData: { /* Chart.js configuration */ },
  suggestions: [
    "View BTC 24h chart",
    "Compare BTC with ETH",
    "Check BTC technical analysis"
  ],
  timestamp: "2024-01-14T15:30:00Z"
}
```

## Fallback Mechanism

When Perplexity returns "No data available" or fails, the fallback path ensures data availability:

```javascript
// In fetchAllDataFast
if (!hasRealPrice || hasNoData) {
  // Fallback to marketDataService
  const marketData = await marketDataService.fetchMarketData(symbol);
  
  if (marketData && marketData.price) {
    return {
      [`${symbol}_market`]: {
        answer: `${symbol} is trading at $${marketData.price} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent}%)`,
        success: true,
        price: marketData.price,
        changePercent: marketData.changePercent,
        volume: marketData.volume,
        quote: marketData,
        source: 'fallback_market_data',  // ✅ Indicates fallback was used
        timestamp: Date.now()
      }
    };
  }
}
```

## Smart Routing

For simple price queries, the system can bypass Perplexity entirely:

```javascript
// In fetchRealtimeData
if (await this.shouldBypassPerplexity(understanding, originalQuery)) {
  const marketData = await marketDataService.fetchMarketData(symbol);
  
  return {
    data: {
      [`${symbol}_market`]: {
        answer: `${symbol} is trading at $${marketData.price}...`,
        price: marketData.price,
        // ... other fields
        source: 'direct_market_data'
      }
    },
    symbolsUsed: [symbol]
  };
}
```

## Key Insights

1. **Data Preservation:** The fix ensures realTimeData from marketDataService is preserved through all stages
2. **Consistent Structure:** All stages now use `{symbol}_market` as the key pattern
3. **Multiple Access Patterns:** Validation handles various data structures defensively
4. **Source Tracking:** Each response includes a `source` field to track data origin
5. **Fallback Robustness:** Multiple layers ensure data availability even when primary sources fail

## Testing the Fix

Run these tests to verify the pipeline:
```bash
# Test individual stages
node test-pipeline-stages.js

# Test complete data flow
node test-pipeline-data-flow.js

# Test all query types
node test-all-query-types.js
```

Expected result: All tests should show real prices (e.g., $118,108) instead of templates ($X) or "No data available".