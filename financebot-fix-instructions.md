# FinanceBot Pro v4.0 - Critical Fixes

Please fix the following issues in this project:

## 1. FIX PORTFOLIO ANALYZER (CRITICAL - Do this first!)

In server.js, add at the top with other imports:

```javascript
const pLimit = require('p-limit');
Then fix the performAnalysis method in the PortfolioAnalyzer class.
2. UPGRADE CHARTS/GRAPHS

Replace the basic line chart with professional financial charts
Add candlestick charts, volume bars, and technical indicators
Make charts dynamic based on the data being displayed

3. IMPROVE DATA PRESENTATION

When users ask for comparisons (X vs Y), show data in tables
Add trend indicators (▲▼) with color coding
Format financial data properly with commas and currency symbols

4. FIX INTENT CLASSIFIER

The bot answered "how to make gluten free pizza?" - fix this
Reduce context boost weight to prevent over-classification
Add confidence threshold - if < 0.8, treat as non-financial

5. IMPROVE ERROR HANDLING

OPEC symbol keeps failing - add proper symbol validation
Add fallback when APIs fail
Show user-friendly error messages

6. PORTFOLIO FEATURES

Fix CSV upload and analysis
Add portfolio performance metrics
Show diversification analysis
Calculate risk metrics

Please test each fix before moving to the next. Start with fixing the p-limit import error.
```
