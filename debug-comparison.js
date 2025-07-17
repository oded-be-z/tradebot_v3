// Debug script to test comparison symbol extraction
const intelligentResponse = require('./services/intelligentResponse');

function testSymbolExtraction() {
  console.log('🔍 Testing Symbol Extraction...\n');
  
  const testQueries = [
    'gold vs silver chart',
    'AAPL vs MSFT chart',
    'bitcoin vs ethereum chart',
    'oil vs gas chart',
    'gold vs silver',
    'compare AAPL and MSFT'
  ];
  
  testQueries.forEach(query => {
    console.log(`Query: "${query}"`);
    
    // Test the new mapToSymbol function
    if (intelligentResponse.mapToSymbol) {
      console.log('  mapToSymbol("gold"):', intelligentResponse.mapToSymbol('gold'));
      console.log('  mapToSymbol("silver"):', intelligentResponse.mapToSymbol('silver'));
    } else {
      console.log('  mapToSymbol function not found');
    }
    
    // Test symbol extraction
    if (intelligentResponse.extractComparisonSymbols) {
      const symbols = intelligentResponse.extractComparisonSymbols(query);
      console.log('  Extracted symbols:', symbols);
    } else {
      console.log('  extractComparisonSymbols function not found');
    }
    
    // Test needsChart detection
    const needsChart = query.toLowerCase().includes("chart") || query.toLowerCase().includes("graph");
    console.log('  Needs chart:', needsChart);
    
    console.log('');
  });
}

testSymbolExtraction();