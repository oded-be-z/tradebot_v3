# Azure OpenAI Singleton Fix

## Issue
TypeError: AzureOpenAI is not a constructor at server.js:2522

## Root Cause
- AzureOpenAI is exported as a singleton instance: `module.exports = new AzureOpenAIService()`
- We were trying to create a new instance with `new AzureOpenAI(azureLimiter)`

## Solution
Changed from:
```javascript
const AzureOpenAI = require('./services/azureOpenAI');
const azureOpenAI = new AzureOpenAI(azureLimiter); // ❌ ERROR - not a constructor
```

To:
```javascript
const azureOpenAI = require('./services/azureOpenAI');
azureOpenAI.rateLimiter = azureLimiter; // ✅ Inject into existing singleton
```

## Result
- The singleton pattern is preserved
- Rate limiter is properly injected
- Server should now start successfully

The Azure OpenAI service will use the rate limiter through its existing logic at line 79-101 in makeRequest().