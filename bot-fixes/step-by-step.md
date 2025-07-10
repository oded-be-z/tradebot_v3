# Step by Step Implementation

## Step 1: Create Knowledge Directory
mkdir -p src/knowledge

## Step 2: Create Market Data Service
Create file: src/knowledge/market-data-service.js
- Function to fetch real-time stock prices
- Function to fetch crypto prices
- Cache results for 1 minute

## Step 3: Create NLP Processor
Create file: src/knowledge/nlp-processor.js
- Recognize "Intel", "INTC", "$INTC" as same stock
- Map company names to symbols
- Handle misspellings

## Step 4: Create Knowledge Base
Create file: src/knowledge/knowledge-base.js
- Financial terms dictionary
- Stock symbols database
- Crypto symbols database

## Step 5: Create Guardrails Directory
mkdir -p src/guardrails

## Step 6: Create Intent Classifier
Create file: src/guardrails/intent-classifier.js
- Classify query as financial or non-financial
- Return confidence score

## Step 7: Create Response Filter
Create file: src/guardrails/response-filter.js
- Block non-financial responses
- Return polite refusal message

## Step 8: Create Disclaimer Manager
Create file: src/guardrails/disclaimer-manager.js
- Add disclaimer to financial responses
- Different disclaimers for different content

## Step 9: Create Tests Directory
mkdir -p src/tests

## Step 10: Create Tests
Create all test files based on test-scenarios.md
