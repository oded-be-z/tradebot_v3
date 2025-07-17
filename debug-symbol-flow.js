// Debug the complete symbol extraction flow
const intelligentResponse = require('./services/intelligentResponse');
const safeSymbol = require('./src/utils/safeSymbol');

async function debugSymbolFlow() {
  console.log('🔍 DEBUGGING SYMBOL EXTRACTION FLOW\n');
  
  const testQuery = 'show bitcoin chart';
  console.log(`INPUT: "${testQuery}"\n`);
  
  // Step 1: Test SafeSymbolExtractor directly
  console.log('STEP 1: SafeSymbolExtractor.extractSafeSymbols()');
  const directExtraction = safeSymbol.extractSafeSymbols(testQuery);
  console.log(`Result: [${directExtraction.join(', ')}]\n`);
  
  // Step 2: Test intelligentResponse.extractSymbol
  console.log('STEP 2: intelligentResponse.extractSymbol()');
  const extractedSymbol = intelligentResponse.extractSymbol(testQuery);
  console.log(`Result: ${extractedSymbol}\n`);
  
  // Step 3: Test full response generation
  console.log('STEP 3: Full Response Generation');
  try {
    const response = await intelligentResponse.generateResponse(testQuery, {});
    console.log(`Response type: ${response.type}`);
    console.log(`Response symbol: ${response.symbol}`);
    console.log(`Response data: ${response.data ? 'Present' : 'Missing'}`);
    console.log(`needsChart: ${response.needsChart}`);
    
    if (response.data && response.data.price) {
      console.log(`\nData price: $${response.data.price}`);
    }
  } catch (error) {
    console.error('Error in response generation:', error.message);
  }
  
  // Step 4: Check if there's another extraction method being used
  console.log('\n\nSTEP 4: Checking for other extraction methods...');
  
  // Test the extractComparisonSymbols method
  console.log('Testing extractComparisonSymbols:');
  const compSymbols = intelligentResponse.extractComparisonSymbols(testQuery);
  console.log(`Result: [${compSymbols.join(', ')}]`);
  
  // Check if there's a plain text extraction happening
  console.log('\nChecking for plain text extraction:');
  const words = testQuery.split(/\s+/);
  console.log(`Words: [${words.join(', ')}]`);
  
  words.forEach(word => {
    const upper = word.toUpperCase();
    console.log(`  "${word}" → "${upper}" → Valid ticker? ${/^[A-Z]{1,5}$/.test(upper)}`);
  });
}

debugSymbolFlow().catch(console.error);