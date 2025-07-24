// Direct test of the server response building
const express = require('express');
const app = express();

// Mock logger
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

// Test response building
function testResponseBuilding() {
  console.log('\n🧪 Testing Response Building Logic\n');
  
  // Simulate orchestratorResult
  const orchestratorResult = {
    response: "Comparing Bitcoin to gold...",
    understanding: {
      intent: 'comparison_query',
      symbols: ['BTC', 'GC']
    },
    symbols: ['BTC', 'GC'],
    symbolsUsed: ['BTC', 'GC']
  };
  
  // Agent 2: Fix 3 - Extract symbols from all possible sources
  let symbols = orchestratorResult.symbols || 
                orchestratorResult.symbolsUsed || 
                orchestratorResult.understanding?.symbols || 
                [];
  
  console.log('📍 Symbols extracted:', symbols);
  
  const response = {
    response: orchestratorResult.response,
    type: orchestratorResult.understanding?.intent || 'general',
    symbol: symbols[0] || null,
    symbols: symbols, // ALWAYS INCLUDE SYMBOLS
    showChart: true
  };
  
  console.log('📦 Response object:', response);
  console.log('✅ response.symbols:', response.symbols);
  
  // Simulate chart generation block
  if (response.showChart && (response.symbols?.length > 0 || response.symbol)) {
    const chartSymbols = response.symbols || [response.symbol];
    console.log('📊 Chart symbols:', chartSymbols);
    // Chart generation would happen here
  }
  
  // Build responsePayload
  const responsePayload = {
    success: true,
    response: response.response,
    chartData: null,
    symbol: response.symbol,
    symbols: symbols || response.symbols || [], // Agent 2: Include symbols
    type: response.type,
    showChart: response.showChart,
    metadata: {
      symbol: response.symbol,
      hasPortfolio: false,
      symbols: symbols || response.symbols || []
    }
  };
  
  console.log('\n📤 Final responsePayload:');
  console.log('- symbols field:', responsePayload.symbols);
  console.log('- metadata.symbols:', responsePayload.metadata.symbols);
  console.log('- Has symbols key:', 'symbols' in responsePayload);
  
  return responsePayload;
}

// Run test
const result = testResponseBuilding();
console.log('\n✅ Final result would be:', JSON.stringify(result, null, 2));