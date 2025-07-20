# LLM PIPELINE AUDIT REPORT

## Overview
- **Total LLM touchpoints**: 5 defined, only 2 actively used
- **Average calls per query**: 0-2 (most queries use 0-1)
- **Primary LLM model**: Azure OpenAI gpt-4o
- **Critical Issue**: Date/time queries are blocked BEFORE reaching LLM

## Complete Pipeline Map

```
User Input: "what date is it now?"
    ↓
[Step 1: Local Intent Classification] 
    → IntentClassifier.classifyIntent()
    → Finds "what date is it" in nonFinancialKeywords
    → Returns: { classification: "non-financial", confidence: 0.95 }
    ↓
[Step 2: Non-Financial Check in server.js]
    → IF non-financial AND confidence > 0.6
    → RETURNS REFUSAL MESSAGE ← [EXECUTION STOPS HERE]
    ↓
[Step 3: Would Never Reach] 
    → intelligentResponse.generateResponse()
    → Priority date/time pattern check
    → Azure OpenAI classification
    → generateDateTimeResponse()
```

## Detailed Analysis

### LLM Call #1: Intent Classification
- **Location**: `azureOpenAI.js:classifyIntent()` (line 57)
- **Temperature**: 0.1
- **Max Tokens**: 20
- **Purpose**: Classify user intent into categories
- **Used By**: `intelligentResponse.js` line 90 (only if `useLLM` is true)

**FULL PROMPT**:
```
System: You are a financial query classifier. Classify the user's query into one of these categories:

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

User: [query with optional conversation history]
```

**Issues**: This LLM call is NEVER REACHED for date/time queries because they're blocked earlier

### LLM Call #2: Symbol Extraction
- **Location**: `azureOpenAI.js:extractStockSymbols()` (line 119)
- **Temperature**: 0.1
- **Max Tokens**: 50
- **Purpose**: Extract stock symbols from natural language

**FULL PROMPT**:
```
System: You are a stock symbol extractor. Extract stock symbols from the user's query.

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
[... extensive mappings continue ...]

Return ONLY a comma-separated list of symbols (e.g., "AAPL,MSFT") or "NONE" if no symbols found.

User: [query with optional conversation history]
```

### LLM Call #3: Chart Generation Decision (NOT ACTIVELY USED)
- **Location**: `azureOpenAI.js:shouldGenerateChart()` (line 187)
- **Temperature**: 0.1
- **Max Tokens**: 10
- **Purpose**: Decide if visualization is needed

### LLM Call #4: Response Enhancement (NOT ACTIVELY USED)
- **Location**: `azureOpenAI.js:enhanceResponse()` (line 216)
- **Temperature**: 0.3
- **Max Tokens**: 400
- **Purpose**: Add natural language to raw data

### LLM Call #5: Ambiguity Resolution (NOT ACTIVELY USED)
- **Location**: `azureOpenAI.js:resolveAmbiguity()` (line 252)
- **Temperature**: 0.3
- **Max Tokens**: 100
- **Purpose**: Generate clarifying questions

## Redundancies Found

1. **Dual Intent Classification**: System has BOTH local regex-based classification AND LLM classification
   - Local classifier runs FIRST and can block queries
   - LLM classifier has better date/time handling but may never be reached

2. **Multiple Pattern Checks**: Date/time patterns are checked in:
   - `intent-classifier.js` (blocks as non-financial)
   - `intelligentResponse.js` (priority check)
   - `azureOpenAI.js` (LLM prompt)
   - Creates conflicting behavior

3. **Unused LLM Capabilities**: 3 out of 5 LLM methods are defined but never called
   - Wasted code complexity
   - Unclear if they ever worked

## Root Cause Analysis

### Why Date/Time Queries Fail:

1. **The intent-classifier.js treats date/time as non-financial**:
   ```javascript
   this.nonFinancialKeywords = [
     // Date/Time queries (CRITICAL - must catch "what date is it now")
     "what date is it",
     "what time is it",
     "current date",
     "current time",
     // ... etc
   ```

2. **These keywords give high non-financial scores** (30+ points)

3. **Server.js blocks non-financial queries** with confidence > 0.6:
   ```javascript
   if (
     intentClassification.classification === "non-financial" &&
     intentClassification.confidence > 0.6
   ) {
     return res.json({
       response: "I focus exclusively on financial markets...",
       type: "refusal"
     });
   }
   ```

4. **The Azure OpenAI enhancements NEVER RUN** because execution stops at the refusal

## Cost Analysis

- **Tokens per query**: 
  - Intent classification: ~200-300 tokens (with context)
  - Symbol extraction: ~400-500 tokens (with extensive mappings)
- **API calls per query**: 0-2 (most are 0-1)
- **Estimated cost**: ~$0.001-0.003 per query at current GPT-4 pricing

## Optimization Opportunities

### 1. **Remove Conflicting Classifications**
The local intent classifier is BLOCKING queries that the LLM would handle correctly. Either:
- Remove date/time from nonFinancialKeywords
- Add special handling before the non-financial check
- Trust the LLM classification over local regex

### 2. **Consolidate LLM Calls**
Current separate calls:
- Intent classification
- Symbol extraction

Could be combined into one call that returns:
```json
{
  "intent": "date_time_query",
  "symbols": [],
  "needs_chart": false
}
```

### 3. **Remove Unused Code**
Delete the 3 unused LLM methods to reduce complexity

### 4. **Simplify the Pipeline**
Current: Local classifier → Block/Continue → LLM classifier → Response
Better: LLM classifier → Response

## Proposed Simplified Pipeline

```
User Input
    ↓
[Single LLM Call]
    → Classify intent AND extract entities
    → Return structured response
    ↓
[Generate Response]
    → Based on intent, generate appropriate response
    → No secondary enhancement needed
```

## Critical Recommendations

1. **IMMEDIATE FIX**: Remove date/time patterns from `nonFinancialKeywords` in intent-classifier.js
   - Lines 334-351 should be deleted
   - This will allow date/time queries to pass through

2. **MEDIUM TERM**: Consolidate to single LLM call that handles both classification and extraction

3. **LONG TERM**: Make LLM the primary engine, not just a classifier:
   - Let LLM generate the full response
   - Use local code only for data fetching and formatting

## Conclusion

The system is over-engineered with redundant classification layers that conflict with each other. Date/time queries fail because the local classifier blocks them as "non-financial" before they can reach the LLM that would handle them correctly. The fix is simple: stop treating date/time queries as non-financial in the local classifier.