@echo off
echo 🚀 Starting FinanceBot Pro with Real Market Data...
echo.

REM Set environment variables
set PERPLEXITY_API_KEY=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
set ALPHA_VANTAGE_API_KEY=B58FO0S9C7CCIMTP
set POLYGON_API_KEY=MmyRvqA3zwfQ7vyQTl74alYoRnDgypDo
set NODE_ENV=production
set PORT=3000

echo ✅ Environment variables set
echo 📊 Starting server with real market data integration...
echo.

node server.js

pause 