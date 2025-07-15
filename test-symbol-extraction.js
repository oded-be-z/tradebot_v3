// Quick test for symbol extraction
const IntelligentResponse = require("./services/intelligentResponse");

console.log("Testing symbol extraction...\n");

const testCases = [
  "oil trends",
  "gold analysis",
  "bitcoin price",
  "tell me about silver",
  "AAPL stock",
  "trends", // should return null
];

testCases.forEach((query) => {
  const symbol = IntelligentResponse.extractSymbol(query);
  console.log(`Query: "${query}" → Symbol: ${symbol || "null"}`);
});

console.log("\nDone!");
