// Test that the extraction fix works
const safeSymbol = require('./src/utils/safeSymbol');

// Also need to test the server-side extraction
const serverPath = './server.js';
delete require.cache[require.resolve(serverPath)];

console.log('🔧 Testing Symbol Extraction Fix\n');

// Test SafeSymbolExtractor directly
console.log('1. Direct SafeSymbolExtractor test:');
const testCases = [
  'show bitcoin chart',
  'ethereum price',
  'oil trends with chart',
  'analyze AAPL chart',
  'gold vs silver'
];

testCases.forEach(test => {
  const result = safeSymbol.extractSafeSymbols(test);
  console.log(`   "${test}" → [${result.join(', ')}]`);
});

console.log('\n2. Verify "CHART" is rejected:');
const chartTest = safeSymbol.extractSafeSymbols('chart');
console.log(`   "chart" → [${chartTest.join(', ')}] (should be empty)`);

// Test that pattern matching doesn't extract CHART
console.log('\n3. Test uppercase pattern rejection:');
const upperTest = 'SHOW BITCOIN CHART';
const upperResult = safeSymbol.extractSafeSymbols(upperTest);
console.log(`   "${upperTest}" → [${upperResult.join(', ')}]`);

console.log('\n✅ If all tests show correct symbols and no "CHART", the fix is working!');