# Fix API Integration

Update src/knowledge/market-data-service.js:

1. For stock prices, use POLYGON_API_KEY correctly:
   - Change line 21 to use: process.env.POLYGON_API_KEY
   - Add proper error handling for 401 errors

2. For Alpha Vantage as backup:
   - Add Alpha Vantage integration using process.env.ALPHA_VANTAGE_API_KEY
   - Use endpoint: https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}

3. Update the tests to mock API calls instead of making real ones

Also fix the intent classifier to properly identify:
- "What should I eat" as non-financial 
- Simple queries like "aapl?" as financial
