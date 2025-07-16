// Test the stockSymbols matching logic from server.js
const stockSymbols = [
  "AAPL",
  "GOOGL", 
  "MSFT",
  "TSLA",
  "AMZN",
  "META",
  "NVDA",
  "AMD",
  "NFLX",
  "CRM",
  "apple",
  "google",
  "microsoft",
  "tesla",
  "amazon",
  "meta",
  "nvidia",
  "intel",
  "JPM",
  "BAC",
  "WMT",
  "PG",
  "KO",
  "PFE",
  "JNJ",
  "XOM",
  "CVX",
  "IBM",
  "CSCO",
];

const symbolMappings = {
  // Some mappings from server.js
  apple: "AAPL",
  google: "GOOGL",
  microsoft: "MSFT",
  tesla: "TSLA",
  amazon: "AMZN",
  meta: "META",
  nvidia: "NVDA",
  amd: "AMD",
  // ... other mappings
};

const testQuery = "aapl";
console.log(`Testing query: "${testQuery}"`);
console.log(`Looking for stockSymbols that include "${testQuery}"`);

// Test the exact logic from server.js
const stockMatch = stockSymbols.find((symbol) =>
  testQuery.includes(symbol.toLowerCase()),
);

console.log(`stockMatch result: ${stockMatch}`);

if (stockMatch) {
  const mappedSymbol = symbolMappings[stockMatch.toLowerCase()] || stockMatch.toUpperCase();
  console.log(`Mapped symbol: ${mappedSymbol}`);
} else {
  console.log('No stock match found');
}

// Test with different queries
console.log('\n=== Testing multiple queries ===');
const queries = ['aapl', 'apple', 'amd', 'AAPL', 'aapl?'];

queries.forEach(query => {
  // Clean the query (remove non-alphanumeric except $ . -)
  const cleanedQuery = query.replace(/[^\w\s$.-]/g, " ").replace(/\s+/g, " ").trim();
  
  const match = stockSymbols.find((symbol) =>
    cleanedQuery.includes(symbol.toLowerCase()),
  );
  
  if (match) {
    const mappedSymbol = symbolMappings[match.toLowerCase()] || match.toUpperCase();
    console.log(`"${query}" -> "${cleanedQuery}" -> found "${match}" -> "${mappedSymbol}"`);
  } else {
    console.log(`"${query}" -> "${cleanedQuery}" -> no match`);
  }
});