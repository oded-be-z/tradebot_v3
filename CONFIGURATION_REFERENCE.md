# FinanceBot Pro - Configuration & Prompts Reference

## Quick Reference Guide

### 1. API Endpoints & Keys

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://brn-azai.cognitiveservices.azure.com/
AZURE_OPENAI_KEY=***
API_VERSION=2024-10-21
DEPLOYMENT=gpt-4o

# Market Data APIs
POLYGON_API_KEY=***
ALPHA_VANTAGE_API_KEY=***
PERPLEXITY_API_KEY=***

# Server
PORT=3000
NODE_ENV=development
```

### 2. Key System Prompts

#### Main Assistant Prompt
```javascript
// File: services/azureOpenAI.js:471
const systemPrompt = `You are Max, a sharp financial advisor.

Important guidelines:
Please avoid these phrases in your response:
- "let me know" or similar
- "feel free to ask"
- "I'm here to help"
- "just ask"
- Questions at the end of responses
- "Want me to..."
- "Curious about..."
- "Should I..."

Keep responses VERY brief: 100-150 chars max. Answer directly in the first sentence.

Good examples (with character counts):
✓ "AAPL's at $211.18, up 0.9% today. AI iPhone hype pushing momentum." (66 chars)
✓ "BTC broke $45K resistance. Next target $47K." (45 chars)
✓ "NVDA crushing AMD - up 195% vs -3% YoY." (40 chars)

Examples to avoid:
- "AAPL's at $211.18. Would you like to see the chart?"
- "BTC is rising. Let me know if you want details."
- Any response ending with a question`;
```

#### Portfolio Analysis Prompt
```javascript
// File: services/azureOpenAI.js:462
Portfolio analysis format (keep under 200 chars):
"Your portfolio's up 34.45% ($10,475) - strong performance! 
CASH at 98.37% is underutilized. Consider SPY or MSFT for better returns."

Keep responses brief and focused on their actual holdings.
End with actionable insights, not questions.
```

### 3. Token Limits Configuration

```javascript
// File: services/azureOpenAI.js:367
const tokenLimits = {
    'greeting': 100,              // ~50-80 chars
    'price_query': 100,           // ~100-150 chars  
    'comparison': 200,            // ~200-300 chars
    'comparison_query': 200,      // ~200-300 chars
    'portfolio_analysis': 300,    // ~300-400 chars max
    'portfolio_query': 300,       // ~300-400 chars max
    'trend_query': 150,           // ~150-200 chars
    'trend_analysis': 150,        // ~150-200 chars
    'general_response': 150,      // ~150-200 chars
    'date_time_query': 50,        // ~50 chars
    'company_info': 150,          // ~150 chars
    'standard_analysis': 150,     // ~150-200 chars
    'investment_advice': 150,     // ~150-200 chars
    'default': 150                // ~150 chars
};
```

### 4. Temperature Settings

```javascript
// File: services/azureOpenAI.js:350
// CRITICAL: Use ZERO temperature for consistency
if (queryType === 'greeting' || queryType === 'capability') {
    temperature = 0.0; // ZERO variation
} else if (queryType === 'general_response') {
    temperature = 0.2; // Low for controlled responses
} else if (queryType === 'portfolio_analysis') {
    temperature = 0.0; // ZERO for financial accuracy
} else if (queryType === 'trend_query') {
    temperature = 0.1; // Very low for market insights
}
```

### 5. Banned Phrases Configuration

```javascript
// File: services/azureOpenAI.js:863
const bannedPhrases = [
    /let me know[^.?]*/gi,
    /feel free to ask[^.?]*/gi,
    /i'm here to[^.?]*/gi,
    /want me to\s*[^.?]*/gi,
    /curious about\s*[^.?]*/gi,
    /should i\s*[^.?]*\?/gi,
    /interested in\s*[^.?]*\?/gi,
    /would you like[^.?]*\?/gi,
    /what's on your mind[^.?]*/gi,
    /anything else[^.?]*/gi,
    /any other[^.?]*\?/gi,
    /what would you[^.?]*\?/gi
];
```

### 6. Cache Configuration

```javascript
// File: services/marketDataService.js
const CACHE_CONFIG = {
    TTL: 60000,           // 1 minute cache for market data
    MAX_SIZE: 100,        // Maximum cached symbols
    CLEANUP_INTERVAL: 300000  // Clean every 5 minutes
};
```

### 7. Rate Limits

```javascript
// File: server.js (recommended addition)
const rateLimitConfig = {
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 requests per minute per IP
    message: "Too many requests, please try again later."
};
```

### 8. Session Configuration

```javascript
// File: server.js:205
const sessionConfig = {
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    maxHistoryLength: 100,          // Max conversation messages
    inactivityTimeout: 30 * 60 * 1000  // 30 minutes
};
```

### 9. File Upload Limits

```javascript
// File: server.js:219
const uploadConfig = {
    fileSize: 5 * 1024 * 1024,  // 5MB max
    allowedTypes: ['text/csv', 'application/csv'],
    fieldName: 'file'
};
```

### 10. WebSocket Configuration

```javascript
// File: server.js:2768
const socketConfig = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
};
```

### 11. Error Messages

```javascript
// Standardized error responses
const ERROR_MESSAGES = {
    INVALID_SYMBOL: "I couldn't find that symbol. Try AAPL, MSFT, or BTC.",
    API_ERROR: "Market data temporarily unavailable. Please try again.",
    SESSION_ERROR: "Session expired. Please refresh the page.",
    PORTFOLIO_ERROR: "Unable to process portfolio. Check CSV format.",
    RATE_LIMIT: "Too many requests. Please wait a moment.",
    CONTENT_FILTER: "Unable to process request. Please rephrase."
};
```

### 12. Market Data API Priorities

```javascript
// File: services/marketDataService.js
const API_PRIORITY = {
    1: 'polygon',      // Primary - real-time data
    2: 'alphaVantage', // Fallback 1 - 5 calls/minute
    3: 'perplexity'    // Fallback 2 - web scraping
};
```

### 13. Response Format Templates

```javascript
// Price Query Response
`${symbol} at $${price}, ${changeDirection} ${Math.abs(changePercent)}%.`

// Trend Analysis Response
`${symbol} showing ${trend} momentum at $${price}. ${insight}.`

// Comparison Response
`${symbol1} (${change1}%) ${comparison} ${symbol2} (${change2}%).`

// Portfolio Response
`Portfolio ${direction} ${changePercent}% ($${changeAmount}). ${insight}.`
```

### 14. Logging Configuration

```javascript
// File: services/logger.js
const logConfig = {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    format: 'YYYY-MM-DD HH:mm:ss',
    maxFiles: 5,
    maxSize: '10m'
};
```

### 15. Health Check Endpoints

```javascript
// Recommended health checks
GET /health          // Overall system health
GET /health/azure    // Azure OpenAI status
GET /health/market   // Market data APIs status
GET /health/memory   // Memory usage check
```

### 16. Environment-Specific Settings

```javascript
// Development
if (process.env.NODE_ENV === 'development') {
    config.verboseLogging = true;
    config.errorDetails = true;
    config.cacheTTL = 30000;  // 30s cache
}

// Production
if (process.env.NODE_ENV === 'production') {
    config.verboseLogging = false;
    config.errorDetails = false;
    config.cacheTTL = 60000;  // 60s cache
}
```

### 17. Critical Paths & Timeouts

```javascript
const TIMEOUTS = {
    azureOpenAI: 30000,      // 30 seconds
    marketDataAPI: 10000,    // 10 seconds
    webScraping: 15000,      // 15 seconds
    totalRequest: 45000      // 45 seconds max
};
```

### 18. Validation Rules

```javascript
// Symbol validation
const SYMBOL_RULES = {
    pattern: /^[A-Z]{1,5}$/,
    minLength: 1,
    maxLength: 5,
    allowedChars: 'A-Z'
};

// Query validation
const QUERY_RULES = {
    maxLength: 500,
    minLength: 1,
    bannedPatterns: [/<script>/gi, /javascript:/gi]
};
```

### 19. Feature Flags

```javascript
const FEATURES = {
    USE_LLM: true,
    ENABLE_CHARTS: true,
    ALLOW_PORTFOLIO_UPLOAD: true,
    ENABLE_WEBSOCKET: true,
    USE_CACHE: true,
    ENFORCE_RATE_LIMITS: false,  // Enable in production
    LOG_ALL_REQUESTS: false      // Disable in production
};
```

### 20. Monitoring Metrics

```javascript
// Key metrics to track
const METRICS = {
    responseTime: {
        target: 3000,      // 3s target
        alert: 5000        // Alert if > 5s
    },
    errorRate: {
        target: 0.01,      // 1% error rate
        alert: 0.05        // Alert if > 5%
    },
    cacheHitRate: {
        target: 0.70,      // 70% cache hits
        alert: 0.50        // Alert if < 50%
    }
};
```

---

## Quick Debugging Commands

```bash
# Check server health
curl http://localhost:3000/health

# Test basic query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "AAPL price", "sessionId": "test123"}'

# Check logs
tail -f server.log | grep ERROR

# Monitor memory usage
node --inspect server.js

# Test with specific session
export SESSION_ID="test_session_123"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"AAPL\", \"sessionId\": \"$SESSION_ID\"}"
```

---

## Emergency Fixes

### If Azure OpenAI is blocking requests:
1. Check for aggressive language in prompts
2. Reduce conversation history to 3 messages
3. Use fallback simplified prompt
4. Set temperature to 0.0

### If responses are too long:
1. Reduce token limits in tokenLimits config
2. Add character count to system prompt
3. Enhance enforceResponseBrevity regex
4. Check for prompt injection

### If market data fails:
1. Check API keys are valid
2. Verify rate limits not exceeded
3. Test each API independently
4. Check network connectivity

---

*Last Updated: January 22, 2025*