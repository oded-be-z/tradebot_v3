# Azure OpenAI LLM Calls Documentation

This document provides a comprehensive overview of every Azure OpenAI LLM call in the codebase, including exact prompts, settings, and usage contexts.

## Service Configuration

**File:** `/home/odedbe/tradebot_v3/services/azureOpenAI.js`

**Endpoint:** `https://brn-azai.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview`

**Base Settings:**
- Model: gpt-4o
- Timeout: 10000ms (10 seconds)
- Max Retries: 2
- Default Temperature: 0.1
- Default Max Tokens: 500

---

## 1. Intent Classification (`classifyIntent`)

**Purpose:** Classifies user queries into predefined categories to route them to appropriate handlers.

**Location:** `services/azureOpenAI.js:57-129`

### System Prompt:
```
You are a financial query classifier. Classify the user's query into one of these categories:

CRITICAL PRIORITY RULES:
1. If the query contains ANY of these patterns, IMMEDIATELY return "date_time_query":
   - "what date" (in any form)
   - "what time" (in any form)
   - "current date"
   - "current time"
   - "today's date"
   - "what day"
   - ANY question explicitly asking about date or time

2. IGNORE any stock symbols that might match date/time words (DATE, TIME, NOW, DAY)

Examples that MUST return "date_time_query":
- "what date is it now?" → date_time_query
- "what time is it?" → date_time_query
- "what's today's date?" → date_time_query
- "current time please" → date_time_query
- "tell me what date it is" → date_time_query

ONLY AFTER checking for date/time, classify into these categories:
- stock_query: Questions about specific stocks, prices, or market data
- comparison_query: Comparing two or more stocks/assets
- trend_query: Questions about trends, forecasts, or historical movements
- portfolio_query: Questions about portfolio analysis or optimization
- general_question: Non-financial questions

Respond with ONLY the category name, nothing else.
```

### Call Parameters:
- Temperature: 0.1
- Max Tokens: 20

### Usage:
Called from `intelligentResponse.js:90` when `useLLM` flag is true.

### Output Format:
Single word category name (e.g., "stock_query", "date_time_query")

---

## 2. Stock Symbol Extraction (`extractStockSymbols`)

**Purpose:** Extracts stock symbols from natural language queries, including handling context from conversation history.

**Location:** `services/azureOpenAI.js:131-194`

### System Prompt:
```
You are a stock symbol extractor. Extract stock symbols from the user's query.

Rules:
1. For explicit symbols (AAPL, MSFT, BTC), extract them
2. For company names, convert to symbols (Apple → AAPL, Microsoft → MSFT)
3. For "them", "these", "those" - look at conversation history for recently mentioned symbols
4. For commodities: oil → CL, gold → GC, silver → SI, natural gas → NG, nat gas → NG
5. For crypto: bitcoin → BTC, ethereum → ETH

IMPORTANT INDEX/ETF MAPPINGS:
- "S&P 500", "S&P", "SP500" → SPY
- "Nasdaq", "nasdaq 100", "nasdaq index" → QQQ  
- "Dow Jones", "Dow", "DJIA", "dow jones index" → DIA
- "Russell 2000" → IWM
- "VIX", "volatility index" → VXX
- "Total market", "total stock market" → VTI

STOCK GROUP MAPPINGS:
- "FAANG" or "FAANG stocks" → META,AAPL,AMZN,NFLX,GOOGL
- "MAMAA" → META,AAPL,MSFT,AMZN,GOOGL
- "tech stocks" or "technology stocks" or "tech sector" → AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA,INTC,AMD,CRM,ORCL,ADBE
- "tech stocks comparison" → AAPL,MSFT,GOOGL,AMZN,META,NVDA (return top 6 for comparison)
- "semiconductor stocks" or "chip stocks" → NVDA,AMD,INTC,QCOM,AVGO,MU,TSM,ASML
- "AI stocks" or "artificial intelligence stocks" → NVDA,MSFT,GOOGL,META,CRM,PLTR,AI,PATH
- "EV stocks" or "electric vehicle stocks" → TSLA,RIVN,LCID,NIO,LI,XPEV,FSR,GOEV
- "bank stocks" or "banking stocks" or "financial stocks" → JPM,BAC,WFC,C,GS,MS,USB,PNC,TFC,COF
- "crypto" or "crypto market" or "cryptocurrency" → BTC,ETH,BNB,SOL,ADA,XRP,DOGE,AVAX
- "energy stocks" or "oil stocks" → XOM,CVX,COP,OXY,SLB,HAL,BKR,MPC
- "retail stocks" → AMZN,WMT,HD,COST,TGT,LOW,TJX,ROST
- "healthcare stocks" or "pharma stocks" → JNJ,UNH,PFE,ABBV,TMO,ABT,CVS,LLY

Return ONLY a comma-separated list of symbols (e.g., "AAPL,MSFT") or "NONE" if no symbols found.
```

### Call Parameters:
- Temperature: 0.1
- Max Tokens: 50

### Usage:
Called from:
1. `intelligentResponse.js:251` - For comparison queries
2. `intelligentResponse.js:993` - For standard symbol extraction
3. `server.js:2845` - Debug endpoint for testing symbol extraction

### Output Format:
Comma-separated list of uppercase symbols (e.g., "AAPL,MSFT,GOOGL") or "NONE"

---

## 3. Chart Generation Decision (`shouldGenerateChart`)

**Purpose:** Determines whether a query requires chart visualization.

**Location:** `services/azureOpenAI.js:196-223`

### System Prompt:
```
Does this financial query need a chart visualization? 
Query: "[user query]"

Respond with only "YES" or "NO".
```

### Call Parameters:
- Temperature: 0.1
- Max Tokens: 10

### Usage:
Currently defined but not actively used in the codebase. Would be called to determine if charts should be generated for responses.

### Output Format:
"YES" or "NO"

---

## 4. Response Enhancement (`enhanceResponse`)

**Purpose:** Enhances raw data responses with natural language explanations while keeping numerical data accurate.

**Location:** `services/azureOpenAI.js:225-259`

### System Prompt:
```
You are a financial advisor. Enhance this response with natural language while keeping all data accurate.

Rules:
1. Keep ALL numerical data exactly as provided
2. Add brief context or insights
3. Ensure response has a proper conclusion
4. Keep it concise (2-3 paragraphs max)
5. Use professional but friendly tone
```

### User Message Format:
```
Query: "[original user query]"
Data: [JSON formatted data]

Provide an enhanced response.
```

### Call Parameters:
- Temperature: 0.3
- Max Tokens: 400

### Usage:
Currently defined but not actively used. Would enhance raw data responses with contextual explanations.

### Output Format:
2-3 paragraphs of enhanced natural language response

---

## 5. Ambiguity Resolution (`resolveAmbiguity`)

**Purpose:** Generates clarifying questions when user queries are ambiguous.

**Location:** `services/azureOpenAI.js:261-279`

### System Prompt:
```
The user query "[query]" is ambiguous. It could mean:
1. [interpretation 1]
2. [interpretation 2]
...

Generate a clarifying question to ask the user. Be brief and specific.
```

### Call Parameters:
- Temperature: 0.3
- Max Tokens: 100

### Usage:
Currently defined but not actively used. Would be called when queries like "DATE" or "NOW" are ambiguous (could be date/time or stock ticker).

### Output Format:
A clarifying question (e.g., "Did you mean the current date or the DATE ETF?")

---

## Core Integration Points

### 1. IntelligentResponseGenerator (`services/intelligentResponse.js`)

**Usage Pattern:**
```javascript
// Line 87-111: Intent classification with LLM fallback
if (this.useLLM) {
  const formattedHistory = this.formatConversationHistory(context.conversationHistory || []);
  const llmIntent = await this.azureOpenAI.classifyIntent(query, formattedHistory);
  
  // Maps LLM intents to system intents
  const intentMap = {
    'stock_query': 'standard',
    'comparison_query': 'comparison',
    'trend_query': 'trend_analysis',
    'portfolio_query': 'portfolio_analysis',
    'general_question': 'non_financial',
    'date_time_query': 'date_time'
  };
}
```

**Symbol Extraction Usage:**
```javascript
// Line 248-256: For comparisons
const symbols = await this.azureOpenAI.extractStockSymbols(query, formattedHistory);

// Line 991-997: For general queries
const symbols = await this.azureOpenAI.extractStockSymbols(query, formattedHistory);
```

### 2. Debug Endpoints (`server.js`)

**Symbol Extraction Test:** `/api/debug/extract-symbols`
```javascript
// Line 2844-2845
const azureOpenAI = require('./services/azureOpenAI');
symbols = await azureOpenAI.extractStockSymbols(query, formattedHistory);
```

**Intent Classification Test:** `/api/debug/classify-intent`
```javascript
// Line 2875-2877
const azureOpenAI = require('./services/azureOpenAI');
azureIntent = await azureOpenAI.classifyIntent(query, formattedHistory);
```

---

## Performance Characteristics

1. **Retry Logic:** Each call attempts up to 3 times (1 initial + 2 retries) with exponential backoff
2. **Timeout:** 10 seconds per request
3. **Fallback Behavior:** 
   - Intent classification falls back to regex patterns
   - Symbol extraction falls back to regex patterns
   - All methods return null/empty on failure to trigger fallbacks

## Error Handling

All methods include try-catch blocks with:
- Detailed error logging via logger
- Graceful fallback to regex-based methods
- No user-facing errors (returns null to trigger fallbacks)

## Token Usage Summary

- **Intent Classification:** 20 tokens max (returns single word)
- **Symbol Extraction:** 50 tokens max (returns symbol list)
- **Chart Decision:** 10 tokens max (returns YES/NO)
- **Response Enhancement:** 400 tokens max (returns paragraphs)
- **Ambiguity Resolution:** 100 tokens max (returns question)

## Feature Flag

The LLM integration can be toggled on/off via the `useLLM` flag in `IntelligentResponseGenerator`:
```javascript
this.useLLM = true; // Feature flag for LLM integration
```

When disabled, the system falls back to regex-based pattern matching for all operations.