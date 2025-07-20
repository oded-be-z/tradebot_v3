#!/usr/bin/env node

/**
 * Priority 1 Fixes for FinanceBot Pro
 * Based on comprehensive test results
 */

// Fix 1: Add index/ETF mappings to azureOpenAI.js system prompt
const indexMappings = `
ADDITIONAL MAPPINGS:
- S&P 500, S&P, SP500 → SPY
- Nasdaq, nasdaq 100 → QQQ  
- Dow Jones, Dow, DJIA → DIA
- Russell 2000 → IWM
- VIX, volatility index → VXX
- Total market → VTI
`;

// Fix 2: Enhanced typo correction logic
function enhancedTypoCorrection(input) {
  // Levenshtein distance implementation
  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  
  // Common tickers to check against
  const commonTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA',
    'JPM', 'BAC', 'WMT', 'HD', 'V', 'MA', 'DIS', 'NFLX', 'AMD'
  ];
  
  const upperInput = input.toUpperCase();
  
  // Check exact match first
  if (commonTickers.includes(upperInput)) {
    return upperInput;
  }
  
  // Find closest match with Levenshtein distance
  let bestMatch = null;
  let bestDistance = Infinity;
  
  for (const ticker of commonTickers) {
    const distance = levenshtein(upperInput, ticker);
    if (distance < bestDistance && distance <= 1) { // Max 1 character difference
      bestDistance = distance;
      bestMatch = ticker;
    }
  }
  
  return bestMatch;
}

// Fix 3: Group stock recognition
const stockGroups = {
  'FAANG': ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'],
  'MAMAA': ['META', 'AAPL', 'MSFT', 'AMZN', 'GOOGL'],
  'TECH_GIANTS': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
  'EV_STOCKS': ['TSLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV'],
  'BANKS': ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS'],
  'RETAIL': ['WMT', 'AMZN', 'TGT', 'COST', 'HD', 'LOW']
};

// Enhanced Azure OpenAI prompt for market overview queries
const marketOverviewPrompt = `
When user asks for market overview or sector analysis:
1. Identify the sector/market they're asking about
2. Return relevant symbols from these groups:
   - FAANG: META, AAPL, AMZN, NFLX, GOOGL
   - Tech sector: + MSFT, NVDA, CRM, ADBE
   - Crypto market: BTC, ETH, BNB, SOL, ADA
   - Banking: JPM, BAC, WFC, C, GS
   - Energy: XOM, CVX, COP, SLB, OXY
   - Retail: WMT, AMZN, TGT, COST, HD

For "tech stocks comparison", return top 5 tech stocks.
For "crypto market overview", return top 5 cryptocurrencies.
`;

console.log('Priority 1 Fixes Summary:');
console.log('========================\n');

console.log('1. INDEX/ETF MAPPING FIX:');
console.log('   - Add mappings: S&P 500→SPY, Nasdaq→QQQ, Dow Jones→DIA');
console.log('   - Update Azure OpenAI system prompt with index mappings\n');

console.log('2. TYPO CORRECTION FIX:');
console.log('   - Implement Levenshtein distance algorithm');
console.log('   - Auto-correct single character differences');
console.log('   - Example: TSLS → TSLA, AAPL → AAPL\n');

console.log('3. MARKET OVERVIEW FIX:');
console.log('   - Add stock group recognition (FAANG, MAMAA, etc.)');
console.log('   - Handle "tech stocks", "crypto market" queries');
console.log('   - Return multiple relevant symbols\n');

console.log('Implementation Steps:');
console.log('1. Update azureOpenAI.js with enhanced prompts');
console.log('2. Add fuzzy matching to symbol extraction');
console.log('3. Implement group stock handling');
console.log('4. Test with previously failed queries\n');

// Test the typo correction
console.log('Testing Typo Correction:');
console.log('TSLS →', enhancedTypoCorrection('TSLS'));
console.log('AAPLE →', enhancedTypoCorrection('AAPLE'));
console.log('MISCROSOFT →', enhancedTypoCorrection('MISCROSOFT'));
console.log('AMZM →', enhancedTypoCorrection('AMZM'));