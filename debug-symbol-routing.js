// Debug symbol extraction for "aapl?" case
const NLPProcessor = require('./src/knowledge/nlp-processor');
const nlpProcessor = new NLPProcessor();

console.log('=== Testing Symbol Extraction ===\n');

const testCases = [
  'aapl?',
  'aapl',
  'AAPL?',
  'AAPL',
  'apple?',
  'apple',
  'amd?',
  'amd',
  'AMD?',
  'AMD'
];

testCases.forEach(testCase => {
  console.log(`Query: "${testCase}"`);
  
  // Test NLP processor
  const nlpResult = nlpProcessor.processQuery(testCase);
  console.log(`  NLP cleanedText: "${nlpResult.cleanedText}"`);
  console.log(`  NLP symbols: ${JSON.stringify(nlpResult.symbols)}`);
  
  // Test direct extraction
  const extractedSymbols = nlpProcessor.extractSymbols(testCase);
  console.log(`  Direct extraction: ${JSON.stringify(extractedSymbols)}`);
  
  // Test normalization
  const normalized = nlpProcessor.normalizeSymbol(testCase);
  console.log(`  Normalized: ${normalized}`);
  
  console.log('');
});

// Test the text cleaning function specifically
console.log('=== Testing Text Cleaning ===\n');
const cleaningTestCases = ['aapl?', 'aapl!', 'aapl.', 'aapl,', 'aapl;', 'aapl:'];

cleaningTestCases.forEach(testCase => {
  const cleaned = nlpProcessor.cleanText(testCase);
  console.log(`"${testCase}" -> "${cleaned}"`);
});