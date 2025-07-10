# Trading Bot Fix Requirements

## Current Problems
1. Bot doesn't recognize basic stocks/crypto queries (Intel, AMD, Bitcoin trends)
2. Bot answers non-financial questions (gave personal advice)
3. Weak guardrails - needs to refuse non-financial topics politely
4. No financial advice disclaimer
5. Lacks comprehensive testing

## Required Fixes

### 1. KNOWLEDGE ENHANCEMENT
- Add real-time market data integration (Yahoo Finance API or similar)
- Implement NLP for recognizing stock symbols, company names, crypto
- Create knowledge base of financial terms, concepts, instruments
- Add pattern recognition for queries like "what's Intel stock price"
- Support variations: INTC, Intel Corp, Intel stock, $INTC

### 2. GUARDRAILS IMPLEMENTATION
- Create intent classifier to identify financial vs non-financial queries
- Polite refusal templates for non-financial questions
- Add disclaimer system for any response that could be construed as advice
- Implement topic whitelist: stocks, crypto, forex, commodities, market indices
- Block: personal advice, medical, legal, relationship topics

### 3. COMPREHENSIVE TESTING SUITE
- Stock queries: "Intel price", "INTC stock", "what's Intel trading at"
- Crypto queries: "Bitcoin price", "BTC trend", "crypto market cap"
- Financial concepts: "what is P/E ratio", "explain options trading"
- Guardrail tests: "relationship advice", "health tips", "legal questions"
- Edge cases: misspellings, partial names, slang terms
