// Debug IntelligentResponse.extractSymbol method
const IntelligentResponse = require('./services/intelligentResponse');

console.log('=== Testing IntelligentResponse.extractSymbol ===\n');

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
  const result = IntelligentResponse.extractSymbol(testCase);
  console.log(`"${testCase}" -> ${result || 'null'}`);
});

// Test the regex pattern specifically
console.log('\n=== Testing regex pattern ===');
const pattern = /\b[A-Z]{1,5}\b/;
testCases.forEach(testCase => {
  const match = testCase.match(pattern);
  console.log(`"${testCase}" matches /\\b[A-Z]{1,5}\\b/: ${match ? match[0] : 'null'}`);
});

// Test the natural language mapping
console.log('\n=== Testing natural language mapping ===');
const symbolMappings = {
  apple: "AAPL",
  microsoft: "MSFT",
  google: "GOOGL",
  amazon: "AMZN",
  tesla: "TSLA",
  nvidia: "NVDA",
  meta: "META",
  facebook: "META",
};

testCases.forEach(testCase => {
  const lowerQuery = testCase.toLowerCase();
  
  for (const [keyword, symbol] of Object.entries(symbolMappings)) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(lowerQuery)) {
      console.log(`"${testCase}" -> matched "${keyword}" -> ${symbol}`);
      return;
    }
  }
  console.log(`"${testCase}" -> no natural language match`);
});