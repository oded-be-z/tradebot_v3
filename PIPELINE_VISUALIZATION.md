# FinanceBot Pro - Detailed Pipeline Visualization

## 1. Complete Request Flow - Visual Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  User Types: "what's apple price?" → Enter Key → Frontend Validation            │
│                                                                                 │
│  index.html:1650                                                               │
│  ├─ Input validation                                                           │
│  ├─ Duplicate message check (2s window)                                        │
│  └─ WebSocket emit OR HTTP POST                                               │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVER RECEPTION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  server.js:3137 - /api/chat endpoint                                           │
│  ├─ Session validation/creation                                                │
│  ├─ Context building (portfolio, history, lastTopic)                          │
│  └─ LLM-FIRST approach trigger                                                │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENT RESPONSE LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  intelligentResponse.js:158 - generateResponse()                               │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐           │
│  │ Symbol Extract  │───▶│ Intent Analysis │───▶│ Route to Handler│           │
│  │ • Local patterns│    │ • Azure OpenAI  │    │ • Price query   │           │
│  │ • LLM extract   │    │ • Context aware │    │ • Trend analysis│           │
│  │ • Context symbol│    │ • Multi-symbol  │    │ • Portfolio     │           │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘           │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MARKET DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  marketDataService.js - Waterfall API Strategy                                 │
│                                                                                 │
│  ┌────────────┐ FAIL ┌─────────────────┐ FAIL ┌──────────────┐               │
│  │  Polygon   │─────▶│  Alpha Vantage  │─────▶│  Perplexity  │               │
│  │ (Primary)  │      │   (Fallback 1)  │      │ (Fallback 2) │               │
│  └─────┬──────┘      └────────┬────────┘      └──────┬───────┘               │
│        │ SUCCESS              │ SUCCESS               │ SUCCESS                │
│        └──────────────────────┴───────────────────────┴───────────┐            │
│                                                                    ▼            │
│                                                          ┌──────────────────┐   │
│                                                          │ Normalize & Cache│   │
│                                                          └──────────────────┘   │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LLM ENHANCEMENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  azureOpenAI.js:346 - enhanceResponse()                                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐              │
│  │ System Prompt Construction                                   │              │
│  │ • Important guidelines (no banned phrases)                  │              │
│  │ • Character limits (100-150 chars)                         │              │
│  │ • Conversation context (last 3 messages)                   │              │
│  │ • Dynamic temperature (0.0 - 0.2)                          │              │
│  └──────────────────┬──────────────────────────────────────────┘              │
│                     ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐              │
│  │ Azure OpenAI API Call                                       │              │
│  │ • Model: gpt-4o                                            │              │
│  │ • API Version: 2024-10-21                                  │              │
│  │ • Max tokens: 100-300 (dynamic)                           │              │
│  └──────────────────┬──────────────────────────────────────────┘              │
│                     ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐              │
│  │ Response Post-Processing                                    │              │
│  │ • Banned phrase removal (regex)                            │              │
│  │ • Price format fixing ($158. 17 → $158.17)               │              │
│  │ • Length enforcement                                       │              │
│  └─────────────────────────────────────────────────────────────┘              │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSE FORMATTING LAYER                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  responseFormatter.js + chartGenerator.js                                      │
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐        │
│  │ Format Response  │───▶│ Generate Chart?  │───▶│ Add Suggestions │        │
│  │ • Add emojis     │    │ • Check intent   │    │ • Max 1 suggest │        │
│  │ • Structure data │    │ • Price history  │    │ • Context aware │        │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘        │
└───────────────────────┬─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT RESPONSE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Final JSON Response:                                                          │
│  {                                                                             │
│    success: true,                                                              │
│    response: "AAPL at $212.48, up 0.62%. Strong momentum signals growth.",    │
│    chartData: { type: "line", data: [...] },                                 │
│    suggestions: ["Compare with MSFT"],                                        │
│    metadata: { responseTime: 2341, symbolsFound: ["AAPL"] }                  │
│  }                                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Error Handling & Fallback Flows

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ERROR DETECTION POINTS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Azure OpenAI Failures                                                      │
│     ├─ Content Filter (code: content_filter)                                  │
│     ├─ Rate Limit (code: 429)                                                │
│     ├─ Timeout (> 30s)                                                       │
│     └─ Service Error (500)                                                   │
│                                                                                 │
│  2. Market Data Failures                                                       │
│     ├─ Invalid Symbol                                                         │
│     ├─ API Quota Exceeded                                                     │
│     └─ Network Timeout                                                        │
│                                                                                 │
│  3. Processing Failures                                                        │
│     ├─ Invalid User Input                                                     │
│     ├─ Session Corruption                                                     │
│     └─ Memory Overflow                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FALLBACK STRATEGIES                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Azure OpenAI Content Filter → Simplified Prompt                              │
│  ┌────────────────────────────────────────────────────┐                       │
│  │ if (error.code === 'content_filter') {             │                       │
│  │   // Retry with minimal prompt                     │                       │
│  │   messages = [{                                    │                       │
│  │     role: "system",                                │                       │
│  │     content: "Brief financial advisor response."   │                       │
│  │   }, {                                             │                       │
│  │     role: "user",                                  │                       │
│  │     content: query + " (1-2 sentences)"           │                       │
│  │   }];                                              │                       │
│  │   response = await makeRequest(messages, 0, 100);  │                       │
│  │ }                                                  │                       │
│  └────────────────────────────────────────────────────┘                       │
│                                                                                 │
│  Market Data Cascade                                                           │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐                  │
│  │  Polygon    │ ──▶ │ Alpha Vantage│ ──▶ │  Perplexity  │                  │
│  │  Primary    │ ──▶ │  Fallback 1  │ ──▶ │  Fallback 2  │                  │
│  └─────────────┘     └──────────────┘     └──────────────┘                  │
│                                                                                 │
│  Complete LLM Failure → Local Response                                        │
│  ┌────────────────────────────────────────────────────┐                       │
│  │ if (llmFailed && marketData) {                     │                       │
│  │   return `${symbol} at $${price}, ${change}%`;     │                       │
│  │ } else {                                           │                       │
│  │   return "Market data temporarily unavailable.";   │                       │
│  │ }                                                  │                       │
│  └────────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Data Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RAW DATA SOURCES                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Polygon Response:              Alpha Vantage Response:                        │
│  {                              {                                              │
│    "T": "AAPL",                  "01. symbol": "AAPL",                       │
│    "c": 212.48,                  "05. price": "212.48",                      │
│    "d": 1.30,                    "09. change": "1.30",                       │
│    "dp": 0.62,                   "10. change percent": "0.62%",              │
│    "v": 51400000                 "06. volume": "51400000"                    │
│  }                              }                                              │
└────────────┬───────────────────────────────────┬────────────────────────────────┘
             │                                   │
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NORMALIZATION LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  normalizeData(data, source) {                                                 │
│    return {                                                                    │
│      symbol: data.symbol || data.T || data['01. symbol'],                    │
│      price: parseFloat(data.price || data.c || data['05. price']),          │
│      change: parseFloat(data.change || data.d || data['09. change']),       │
│      changePercent: parseFloat(data.dp || data['10. change percent']),      │
│      volume: parseInt(data.v || data['06. volume']),                        │
│      timestamp: Date.now(),                                                  │
│      source: source                                                          │
│    };                                                                        │
│  }                                                                            │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ENRICHMENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Additional Calculations:                                                       │
│  • Market Cap (if available)                                                   │
│  • 52-week high/low comparison                                                │
│  • Volume analysis (above/below average)                                       │
│  • Momentum indicators                                                         │
│  • Sector performance context                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Session & Context Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SESSION LIFECYCLE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  CREATE                          UPDATE                         CLEANUP        │
│  ┌──────────────┐              ┌──────────────┐              ┌──────────────┐ │
│  │ New Session  │              │ Add History  │              │ Expire After │ │
│  │ • Generate ID│              │ • Messages   │              │ • Inactivity │ │
│  │ • Initialize │              │ • Symbols    │              │ • Max Age    │ │
│  │ • Set Prefs  │              │ • Portfolio  │              │ • On Logout  │ │
│  └──────────────┘              └──────────────┘              └──────────────┘ │
│                                                                                 │
│  Session Object Structure:                                                     │
│  {                                                                             │
│    sessionId: "session_1753154223156_abc123",                                │
│    conversationHistory: [                                                     │
│      { role: "user", content: "AAPL price", timestamp: 1753154223156 },     │
│      { role: "assistant", content: "AAPL at $212.48...", timestamp: ... }   │
│    ],                                                                         │
│    portfolio: { holdings: [...], metrics: {...} },                          │
│    lastTopic: "AAPL",                                                       │
│    lastAnalysis: { type: "price_query", timestamp: ... },                   │
│    preferences: { theme: "dark", notifications: true }                      │
│  }                                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5. Prompt Engineering Details

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      DYNAMIC PROMPT CONSTRUCTION                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Base Components:                                                              │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │ Role & Context │ ─▶ │ Guidelines     │ ─▶ │ Examples       │             │
│  │ "You are Max"  │    │ No questions   │    │ Good/Bad       │             │
│  └────────────────┘    └────────────────┘    └────────────────┘             │
│                                                                                 │
│  Context Injection:                                                            │
│  ┌────────────────────────────────────────────────────────────┐              │
│  │ if (conversationState.discussedSymbols.length > 0) {       │              │
│  │   prompt += "Previously discussed: " + symbols.join(", ");  │              │
│  │ }                                                          │              │
│  │ if (portfolio) {                                           │              │
│  │   prompt += "User portfolio: $" + portfolio.totalValue;    │              │
│  │ }                                                          │              │
│  └────────────────────────────────────────────────────────────┘              │
│                                                                                 │
│  Temperature Selection:                                                        │
│  ┌─────────────────────────────────────────────────┐                         │
│  │ Query Type        │ Temperature │ Reason        │                         │
│  ├─────────────────────────────────────────────────┤                         │
│  │ greeting          │ 0.0        │ Consistency   │                         │
│  │ price_query      │ 0.1        │ Accuracy      │                         │
│  │ portfolio_query  │ 0.0        │ Precision     │                         │
│  │ trend_analysis   │ 0.1        │ Slight variety│                         │
│  │ general_response │ 0.2        │ Flexibility   │                         │
│  └─────────────────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Performance Optimization Strategies

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         OPTIMIZATION LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Caching Strategy                                                           │
│  ┌──────────────────────────────────────────────────┐                         │
│  │ Market Data Cache (60s TTL)                      │                         │
│  │ • Key: symbol + timestamp (minute precision)     │                         │
│  │ • Value: normalized data object                  │                         │
│  │ • Invalidation: on error or TTL expiry          │                         │
│  └──────────────────────────────────────────────────┘                         │
│                                                                                 │
│  2. Request Batching                                                           │
│  ┌──────────────────────────────────────────────────┐                         │
│  │ Multiple Symbols → Single API Call               │                         │
│  │ Polygon: symbols=AAPL,MSFT,GOOGL                │                         │
│  │ Reduces: 3 calls → 1 call                       │                         │
│  └──────────────────────────────────────────────────┘                         │
│                                                                                 │
│  3. Token Optimization                                                         │
│  ┌──────────────────────────────────────────────────┐                         │
│  │ Dynamic Limits by Query Type                     │                         │
│  │ • Greeting: 100 tokens (50-80 chars)            │                         │
│  │ • Price: 100 tokens (100-150 chars)             │                         │
│  │ • Analysis: 150 tokens (150-200 chars)          │                         │
│  └──────────────────────────────────────────────────┘                         │
│                                                                                 │
│  4. Parallel Processing                                                        │
│  ┌──────────────────────────────────────────────────┐                         │
│  │ Promise.all([                                    │                         │
│  │   fetchMarketData(symbol),                      │                         │
│  │   generateBaseResponse(query),                  │                         │
│  │   checkChartNeed(context)                       │                         │
│  │ ])                                               │                         │
│  └──────────────────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

This comprehensive visualization shows:
- Complete data flow from user input to response
- All decision points and branching logic
- Error handling and fallback mechanisms
- Performance optimization strategies
- Detailed configuration and settings

The system is well-architected with multiple layers of resilience and optimization!