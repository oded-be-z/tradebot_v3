// Test the exact contains logic
const stockSymbols = ["AAPL", "AMD", "MSFT"];

const testCases = [
  { query: "aapl", symbol: "AAPL" },
  { query: "AAPL", symbol: "AAPL" },
  { query: "amd", symbol: "AMD" },
  { query: "AMD", symbol: "AMD" },
];

testCases.forEach(({ query, symbol }) => {
  const lowerSymbol = symbol.toLowerCase();
  const contains = query.includes(lowerSymbol);
  console.log(`"${query}".includes("${lowerSymbol}") = ${contains}`);
  
  // Also test the reverse
  const reverseContains = lowerSymbol.includes(query);
  console.log(`"${lowerSymbol}".includes("${query}") = ${reverseContains}`);
  
  console.log('---');
});

// Test the actual find logic
console.log('\n=== Testing find logic ===');
const queries = ["aapl", "AAPL", "amd", "AMD"];

queries.forEach(query => {
  const match = stockSymbols.find((symbol) =>
    query.includes(symbol.toLowerCase()),
  );
  console.log(`Query: "${query}" -> Match: ${match || 'none'}`);
});

// Test if issue is with the actual message processing
console.log('\n=== Testing message processing ===');
const message = "aapl?";
const lowerMessage = message.toLowerCase();
console.log(`Original: "${message}"`);
console.log(`Lower: "${lowerMessage}"`);

// Clean the message like the NLP processor does
const cleanedMessage = message.replace(/[^\w\s$.-]/g, " ").replace(/\s+/g, " ").trim();
console.log(`Cleaned: "${cleanedMessage}"`);
const cleanedLower = cleanedMessage.toLowerCase();
console.log(`Cleaned+Lower: "${cleanedLower}"`);

// Test the find
const match = stockSymbols.find((symbol) =>
  cleanedLower.includes(symbol.toLowerCase()),
);
console.log(`Final match: ${match || 'none'}`);